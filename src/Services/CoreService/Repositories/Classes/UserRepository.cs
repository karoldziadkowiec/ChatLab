using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ChatLab.CoreService.Repositories.Classes
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _dbContext;
        private readonly UserManager<User> _userManager;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UserRepository(AppDbContext dbContext, UserManager<User> userManager, IPasswordHasher<User> passwordHasher)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _passwordHasher = passwordHasher;
        }

        public async Task<User?> GetUser(string userId)
        {
            var user = await _dbContext.Users.FindAsync(userId);
            return user;
        }

        public async Task<IEnumerable<User>> GetUsers()
        {
            var users = await _dbContext.Users.OrderByDescending(u => u.CreationDate).ToListAsync();
            return users;
        }

        public async Task<IEnumerable<User>> GetOnlyUsers()
        {
            var onlyUsers = await _userManager.GetUsersInRoleAsync("User");
            var sortedUsers = onlyUsers.OrderByDescending(u => u.CreationDate);
            return sortedUsers;
        }

        public async Task<IEnumerable<User>> GetOnlyAdmins()
        {
            var onlyAdmins = await _userManager.GetUsersInRoleAsync("Admin");
            var sortedUsers = onlyAdmins.OrderByDescending(u => u.CreationDate);
            return sortedUsers;
        }

        public async Task<string?> GetUserRole(string userId)
        {
            return await (from ur in _dbContext.UserRoles
                                  join r in _dbContext.Roles on ur.RoleId equals r.Id
                                  where ur.UserId == userId
                                  select r.Name).FirstOrDefaultAsync();
        }

        public async Task<int> GetUserCount()
        {
            return await _dbContext.Users.CountAsync();
        }

        public async Task UpdateUser(User user)
        {
            if (user != null)
            {
                _dbContext.Entry(user).State = EntityState.Modified;
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task ResetUserPassword(User user, string newPassword)
        {
            if (user != null)
            {
                if (!string.IsNullOrEmpty(newPassword))
                    user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);

                _dbContext.Entry(user).State = EntityState.Modified;
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task DeleteUser(string userId)
        {
            var user = await _dbContext.Users.FindAsync(userId);
            if (user == null)
                throw new Exception("User not found");

            var chats = await _dbContext.Chats
                .Where(c => c.User1Id == userId || c.User2Id == userId)
                .ToListAsync();

            foreach (var chat in chats)
            {
                if (chat.User1Id != null && chat.User2Id != null)
                {
                    var messages = await _dbContext.Messages
                        .Where(m => m.ChatId == chat.Id)
                        .ToListAsync();

                    if (messages.Any())
                        _dbContext.Messages.RemoveRange(messages);
                }
            }
            _dbContext.Chats.RemoveRange(chats);

            var userFollowers = await _dbContext.UserFollowers
                .Where(f => f.FollowerId == userId || f.FollowedId == userId)
                .ToListAsync();
            _dbContext.UserFollowers.RemoveRange(userFollowers);

            var unknownUser = await _dbContext.Users
               .Where(u => u.Email == "unknown@unknown.com")
               .SingleOrDefaultAsync();

            if (unknownUser == null)
                throw new InvalidOperationException("Unknown user not found");

            var unknownUserId = unknownUser.Id;

            _dbContext.Users.Remove(user);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<IEnumerable<Chat>> GetUserChats(string userId)
        {
            var chats = await _dbContext.Chats
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Where(c => c.User1Id == userId || c.User2Id == userId)
                .ToListAsync();

            var chatWithLastMessageTimestamps = new List<(Chat Chat, DateTime? LastMessageTimestamp)>();
            foreach (var chat in chats)
            {
                var lastMessageTimestamp = await _dbContext.Messages
                    .Where(m => m.ChatId == chat.Id)
                    .OrderByDescending(m => m.Timestamp)
                    .Select(m => (DateTime?)m.Timestamp)
                    .FirstOrDefaultAsync();
                chatWithLastMessageTimestamps.Add((chat, lastMessageTimestamp));
            }

            return chatWithLastMessageTimestamps
                .OrderByDescending(c => c.LastMessageTimestamp)
                .Select(c => c.Chat)
                .ToList();
        }

        public async Task<MemoryStream> ExportUsersToCsv()
        {
            var users = await GetUsers();
            var csv = new StringBuilder();
            csv.AppendLine("E-mail,First Name,Last Name,Phone Number,Location,Creation Date");

            foreach (var user in users)
            {
                csv.AppendLine($"{user.Email},{user.FirstName},{user.LastName},{user.PhoneNumber},{user.Location},{user.CreationDate:yyyy-MM-dd}");
            }

            var byteArray = Encoding.UTF8.GetBytes(csv.ToString());
            var csvStream = new MemoryStream(byteArray);

            return csvStream;
        }
    }
}