using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Services.Classes
{
    public class MessageService : IMessageService
    {
        private readonly AppDbContext _dbContext;

        public MessageService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Message> GetMessageById(int messageId)
        {
            return await _dbContext.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .FirstOrDefaultAsync(m => m.Id == messageId);
        }

        public async Task<IEnumerable<Message>> GetAllMessages()
        {
            return await _dbContext.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();
        }

        public async Task<int> GetAllMessagesCount()
        {
            return await _dbContext.Messages.CountAsync();
        }

        public async Task<IEnumerable<Message>> GetMessagesForChat(int chatId)
        {
            return await _dbContext.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Where(m => m.ChatId == chatId)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();
        }

        public async Task<int> GetMessagesForChatCount(int chatId)
        {
            return await _dbContext.Messages
                .Where(m => m.ChatId == chatId)
                .CountAsync();
        }

        public async Task<DateTime> GetLastMessageDateForChat(int chatId)
        {
            return await _dbContext.Messages
                .Where(m => m.ChatId == chatId)
                .OrderByDescending(m => m.Timestamp)
                .Select(m => m.Timestamp)
                .FirstOrDefaultAsync();
        }

        public async Task<Message> SendMessage(MessageSendDTO dto)
        {
            var message = new Message
            {
                ChatId = dto.ChatId,
                SenderId = dto.SenderId,
                ReceiverId = dto.ReceiverId,
                Content = dto.Content,
                Timestamp = DateTime.Now
            };

            _dbContext.Messages.Add(message);
            await _dbContext.SaveChangesAsync();

            return message;
        }

        public async Task DeleteMessage(int messageId)
        {
            var message = await _dbContext.Messages.FindAsync(messageId);

            if (message == null)
                throw new ArgumentException($"No message found with ID {messageId}");

            _dbContext.Messages.Remove(message);
            await _dbContext.SaveChangesAsync();
        }
    }
}