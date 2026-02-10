using ChatLab.CoreService.Models.DTOs;
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

        public async Task SendMessage(MessageSendDTO messageSendDTO)
        {
            // Basic validation: ensure sender belongs to the chat
            var chat = await _chatService.GetChatById(messageSendDTO.ChatId);
            var allowed = $"{chat.User1Id}" == $"{messageSendDTO.SenderId}" || $"{chat.User2Id}" == $"{messageSendDTO.SenderId}";
            if (!allowed)
            {
                throw new HubException("Sender is not a participant of this chat.");
            }

            var message = await _messageService.SendMessage(messageSendDTO);
            await Clients.Group(messageSendDTO.ChatId.ToString()).SendAsync("ReceiveMessage", message);
        }

        public async Task JoinChat(int chatId, string userId)
        {
            // Validate that joining user belongs to the chat
            var chat = await _chatService.GetChatById(chatId);
            var allowed = $"{chat.User1Id}" == userId || $"{chat.User2Id}" == userId;
            if (!allowed)
            {
                throw new HubException("User is not a participant of this chat.");
            }

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