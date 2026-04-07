using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface IMessageService
    {
        Task<Message> GetMessageById(int messageId);
        Task<IEnumerable<Message>> GetAllMessages();
        Task<int> GetAllMessagesCount();
        Task<IEnumerable<Message>> GetMessagesForChat(int chatId);
		Task<IEnumerable<Message>> GetMessagesForChatAfterId(int chatId, int afterMessageId);
        Task<int> GetMessagesForChatCount(int chatId);
        Task<DateTime> GetLastMessageDateForChat(int chatId);
        Task<Message> SendMessage(MessageSendDTO messageDto);
        Task DeleteMessage(int messageId);
    }
}