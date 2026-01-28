using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Proto = Chatlab.Grpc;
using Google.Protobuf.WellKnownTypes;
using ChatLab.CoreService.Services.Interfaces;
using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.RealTime.GRPC.Services
{
    [Authorize]
    public class ChatGrpcService : Proto.ChatGrpc.ChatGrpcBase
    {
        private readonly IMessageService _messageService;
        private readonly ILogger<ChatGrpcService> _logger;

        public ChatGrpcService(IMessageService messageService, ILogger<ChatGrpcService> logger)
        {
            _messageService = messageService;
            _logger = logger;
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
            var lastId = request.SinceMessageId > 0 ? request.SinceMessageId : 0;
            while (!context.CancellationToken.IsCancellationRequested)
            {
                try
                {
                    var msgs = await _messageService.GetMessagesForChat(request.ChatId);
                    foreach (var m in msgs)
                    {
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
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error streaming chat {ChatId}", request.ChatId);
                }
                await Task.Delay(1000, context.CancellationToken);
            }
        }
    }
}
