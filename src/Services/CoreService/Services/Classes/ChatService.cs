using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ChatLab.CoreService.Services.Classes
{
    public class ChatService : IChatService
    {
        private readonly AppDbContext _dbContext;

        public ChatService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Chat> GetChatById(int chatId)
        {
            return await _dbContext.Chats
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c => c.Id == chatId);
        }

        public async Task<IEnumerable<Chat>> GetChats()
        {
            return await _dbContext.Chats
                .Include(c => c.User1)
                .Include(c => c.User2)
                .ToListAsync();
        }

        public async Task<int> GetChatCount()
        {
            return await _dbContext.Chats.CountAsync();
        }

        public async Task<int> GetChatIdBetweenUsers(string user1Id, string user2Id)
        {
            var chatId = await _dbContext.Chats
                .Where(c => (c.User1Id == user1Id && c.User2Id == user2Id) || (c.User1Id == user2Id && c.User2Id == user1Id))
                .Select(c => c.Id)
                .FirstOrDefaultAsync();

            return chatId;
        }

        public async Task CreateChat(Chat chat)
        {
            _dbContext.Chats.Add(chat);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteChat(int chatId)
        {
            var chat = await _dbContext.Chats.FindAsync(chatId);

            if (chat == null)
                throw new ArgumentException($"No chat found with ID {chatId}");

            var messages = await _dbContext.Messages
                    .Where(m => m.ChatId == chatId)
                    .ToListAsync();
            _dbContext.Messages.RemoveRange(messages);

            _dbContext.Chats.Remove(chat);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<MemoryStream> ExportChatsToCsv()
        {
            var chats = await GetChats();
            var csv = new StringBuilder();
            csv.AppendLine("Chat Id,User1 E-mail,User1 First Name,User1 Last Name,User2 E-mail,User2 First Name,User2 Last Name");

            foreach (var chat in chats)
            {
                csv.AppendLine($"{chat.Id},{chat.User1.Email},{chat.User1.FirstName},{chat.User1.LastName},{chat.User2.Email},{chat.User2.FirstName},{chat.User2.LastName}");
            }

            var byteArray = Encoding.UTF8.GetBytes(csv.ToString());
            var csvStream = new MemoryStream(byteArray);

            return csvStream;
        }
    }
}