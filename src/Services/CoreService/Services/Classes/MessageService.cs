using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.RealTime.GRPC.Streaming;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Services.Classes
{
    public class MessageService : IMessageService
    {
        private readonly AppDbContext _dbContext;
        private readonly IChatMessageBus _messageBus;

        public MessageService(AppDbContext dbContext, IChatMessageBus messageBus)
        {
            _dbContext = dbContext;
            _messageBus = messageBus;
        }

        public async Task<Message> GetMessageById(int messageId)
        {
            return await _dbContext.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Include(m => m.CommunicationTechnology)
                .FirstOrDefaultAsync(m => m.Id == messageId);
        }

        public async Task<IEnumerable<Message>> GetAllMessages()
        {
            return await _dbContext.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Include(m => m.CommunicationTechnology)
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
                .Include(m => m.CommunicationTechnology)
                .Where(m => m.ChatId == chatId)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();
        }

		public async Task<IEnumerable<Message>> GetMessagesForChatAfterId(int chatId, int afterMessageId)
		{
			return await _dbContext.Messages
				.AsNoTracking()
				.Include(m => m.CommunicationTechnology)
				.Where(m => m.ChatId == chatId && m.Id > afterMessageId)
				.OrderBy(m => m.Id)
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

        public async Task<Message> SendMessage(MessageSendDTO messageDto)
        {
            var message = new Message
            {
                ChatId = messageDto.ChatId,
                SenderId = messageDto.SenderId,
                ReceiverId = messageDto.ReceiverId,
                Content = messageDto.Content,
                CommunicationTechnologyId = messageDto.CommunicationTechnologyId,
                Timestamp = DateTime.Now
            };

            _dbContext.Messages.Add(message);
            await _dbContext.SaveChangesAsync();

            // Push to in-memory bus for realtime stream subscribers (gRPC StreamChat, etc.).
            // Note: message may not have navigation properties populated (CommunicationTechnology, etc.).
            _messageBus.Publish(message);

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