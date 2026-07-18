using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.RealTime.Authorization;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace ChatLab.CoreService.RealTime.SignalR
{
    public class ChatHub : Hub
    {
        private readonly IChatService _chatService;
        private readonly IMessageService _messageService;

        public ChatHub(IChatService chatService, IMessageService messageService)
        {
            _chatService = chatService;
            _messageService = messageService;
        }

        public async Task<ChatLab.CoreService.Entities.Message> SendMessage(MessageSendDTO messageSendDTO)
        {
            var chat = await ChatRoomAuthorizationHelper.RequireChatAccessAsync(_chatService, messageSendDTO.ChatId, Context.User);
            ChatRoomAuthorizationHelper.RequireSenderMatchesCurrentUserOrAdmin(Context.User, messageSendDTO.SenderId);

            if (!ChatRoomAuthorizationHelper.CanUseReceiver(chat, messageSendDTO.ReceiverId, Context.User))
                throw new HubException("Receiver is not a participant of this chat.");

            var message = await _messageService.SendMessage(messageSendDTO);
            await Clients.Group(messageSendDTO.ChatId.ToString()).SendAsync("ReceiveMessage", message);
            return message;
        }

        public async Task JoinChat(int chatId, string userId)
        {
            var currentUserId = ChatRoomAuthorizationHelper.GetCurrentUserId(Context.User);
            if (!string.Equals(currentUserId, userId, StringComparison.Ordinal))
                throw new HubException("User identity mismatch.");

            if (ChatRoomAuthorizationHelper.IsAdmin(Context.User))
            {
                var chat = await _chatService.GetChatById(chatId);
                if (chat == null)
                    throw new HubException("Chat not found.");

                await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
                return;
            }

            await ChatRoomAuthorizationHelper.RequireChatMemberAsync(_chatService, chatId, currentUserId);

            await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
        }

        public async Task LeaveChat(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId.ToString());
        }

        public override Task OnConnectedAsync()
        {
            // Hook for connection lifecycle; could add metrics or logs here
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            // Hook for cleanup; groups are auto-removed on disconnect
            return base.OnDisconnectedAsync(exception);
        }
    }
}