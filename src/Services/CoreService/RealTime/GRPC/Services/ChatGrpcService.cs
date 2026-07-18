using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Proto = Chatlab.Grpc;
using Google.Protobuf.WellKnownTypes;
using ChatLab.CoreService.Services.Interfaces;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.RealTime.GRPC.Streaming;
using ChatLab.CoreService.RealTime.Authorization;

namespace ChatLab.CoreService.RealTime.GRPC.Services
{
    [Authorize]
    public class ChatGrpcService : Proto.ChatGrpc.ChatGrpcBase
    {
        private readonly IMessageService _messageService;
        private readonly IChatService _chatService;
        private readonly ILogger<ChatGrpcService> _logger;
        private readonly IChatMessageBus _messageBus;

        public ChatGrpcService(IMessageService messageService, IChatService chatService, ILogger<ChatGrpcService> logger, IChatMessageBus messageBus)
        {
            _messageService = messageService;
            _chatService = chatService;
            _logger = logger;
            _messageBus = messageBus;
        }

        public override async Task<Proto.Message> SendMessage(Proto.MessageSend request, ServerCallContext context)
        {
            // Basic validation
            if (request.ChatId <= 0 || string.IsNullOrWhiteSpace(request.SenderId) || string.IsNullOrWhiteSpace(request.ReceiverId) || string.IsNullOrWhiteSpace(request.Content))
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Missing or invalid fields."));
            }

            try
            {
                var user = context.GetHttpContext()?.User;
                var chat = await ChatRoomAuthorizationHelper.RequireChatAccessAsync(_chatService, request.ChatId, user);
                ChatRoomAuthorizationHelper.RequireSenderMatchesCurrentUserOrAdmin(user, request.SenderId);

                if (!ChatRoomAuthorizationHelper.CanUseReceiver(chat, request.ReceiverId, user))
                    throw new RpcException(new Status(StatusCode.PermissionDenied, "Receiver is not a member of this chat."));

                var dto = new MessageSendDTO
                {
                    ChatId = request.ChatId,
                    SenderId = request.SenderId,
                    ReceiverId = request.ReceiverId,
                    CommunicationTechnologyId = request.CommunicationTechnologyId,
                    Content = request.Content
                };

                var created = await _messageService.SendMessage(dto);
                return new Proto.Message
                {
                    Id = created.Id,
                    ChatId = created.ChatId,
                    SenderId = created.SenderId,
                    ReceiverId = created.ReceiverId,
                    Content = created.Content,
                    Timestamp = Timestamp.FromDateTime(created.Timestamp.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(created.Timestamp, DateTimeKind.Utc) : created.Timestamp.ToUniversalTime()),
                    TechnologyName = created.CommunicationTechnology?.Name ?? string.Empty
                };
            }
            catch (RpcException)
            {
                throw;
            }
            catch (ArgumentException ex)
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendMessage failed for chat {ChatId}", request.ChatId);
                throw new RpcException(new Status(StatusCode.Internal, "Failed to send message."));
            }
        }

        public override async Task StreamChat(Proto.StreamRequest request, IServerStreamWriter<Proto.Message> responseStream, ServerCallContext context)
        {
            var user = context.GetHttpContext()?.User;
            var currentUserId = ChatRoomAuthorizationHelper.GetCurrentUserId(user);
            var reqUserId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId.Trim();
            if (!string.IsNullOrWhiteSpace(reqUserId) && !string.Equals(reqUserId, currentUserId, StringComparison.Ordinal))
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "User identity mismatch."));
            }

            await ChatRoomAuthorizationHelper.RequireChatAccessAsync(_chatService, request.ChatId, user);

            var ct = context.CancellationToken;

            // Subscribe first to avoid missing messages during initial catch-up.
            var reader = _messageBus.Subscribe(request.ChatId, ct);
            var lastId = request.SinceMessageId > 0 ? request.SinceMessageId : 0;

            // One-time catch-up from DB (no polling loop).
            try
            {
                var existing = await _messageService.GetMessagesForChatAfterId(request.ChatId, lastId);
                foreach (var m in existing)
                {
                    var outMsg = new Proto.Message
                    {
                        Id = m.Id,
                        ChatId = m.ChatId,
                        SenderId = m.SenderId,
                        ReceiverId = m.ReceiverId,
                        Content = m.Content,
                        Timestamp = Timestamp.FromDateTime(m.Timestamp.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(m.Timestamp, DateTimeKind.Utc) : m.Timestamp.ToUniversalTime()),
                        TechnologyName = m.CommunicationTechnology?.Name ?? string.Empty
                    };
                    await responseStream.WriteAsync(outMsg);
                    lastId = m.Id;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Initial catch-up failed for chat {ChatId}", request.ChatId);
            }

            // Push streaming: emit new messages as they are created.
            await foreach (var m in reader.ReadAllAsync(ct))
            {
                if (m.ChatId != request.ChatId) continue;
                if (m.Id <= lastId) continue;

                var outMsg = new Proto.Message
                {
                    Id = m.Id,
                    ChatId = m.ChatId,
                    SenderId = m.SenderId,
                    ReceiverId = m.ReceiverId,
                    Content = m.Content,
                    Timestamp = Timestamp.FromDateTime(m.Timestamp.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(m.Timestamp, DateTimeKind.Utc) : m.Timestamp.ToUniversalTime()),
                    TechnologyName = m.CommunicationTechnology?.Name ?? string.Empty
                };

                await responseStream.WriteAsync(outMsg);
                lastId = m.Id;
            }
        }
    }
}
