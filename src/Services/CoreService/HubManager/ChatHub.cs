using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace ChatLab.CoreService.HubManager
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
            var message = await _messageService.SendMessage(messageSendDTO);
            await Clients.Group(messageSendDTO.ChatId.ToString()).SendAsync("ReceiveMessage", message);
        }

        public async Task JoinChat(int chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
        }

        public async Task LeaveChat(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId.ToString());
        }
    }
}