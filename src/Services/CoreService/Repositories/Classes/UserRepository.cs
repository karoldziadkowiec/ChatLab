using AutoMapper;
using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ChatLab.CoreService.Repositories.Classes
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _dbContext;
        private readonly IMapper _mapper;
        private readonly UserManager<User> _userManager;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UserRepository(AppDbContext dbContext, IMapper mapper, UserManager<User> userManager, IPasswordHasher<User> passwordHasher)
        {
            _dbContext = dbContext;
            _mapper = mapper;
            _userManager = userManager;
            _passwordHasher = passwordHasher;
        }

        public async Task<UserDTO> GetUser(string userId)
        {
            var user = await _dbContext.Users.FindAsync(userId);
            var userDTO = _mapper.Map<UserDTO>(user);
            return userDTO;
        }

        public async Task<IEnumerable<UserDTO>> GetUsers()
        {
            var users = await _dbContext.Users.OrderByDescending(u => u.CreationDate).ToListAsync();
            var userDTOs = _mapper.Map<IEnumerable<UserDTO>>(users);
            return userDTOs;
        }

        public async Task<IEnumerable<UserDTO>> GetOnlyUsers()
        {
            var onlyUsers = await _userManager.GetUsersInRoleAsync("User");
            var sortedUsers = onlyUsers.OrderByDescending(u => u.CreationDate);
            var onlyUserDTOs = _mapper.Map<IEnumerable<UserDTO>>(sortedUsers);
            return onlyUserDTOs;
        }

        public async Task<IEnumerable<UserDTO>> GetOnlyAdmins()
        {
            var onlyAdmins = await _userManager.GetUsersInRoleAsync("Admin");
            var sortedUsers = onlyAdmins.OrderByDescending(u => u.CreationDate);
            var onlyAdminDTOs = _mapper.Map<IEnumerable<UserDTO>>(sortedUsers);
            return onlyAdminDTOs;
        }

        public async Task<string> GetUserRole(string userId)
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

        public async Task UpdateUser(string userId, UserUpdateDTO dto)
        {
            var user = await _dbContext.Users.FindAsync(userId);
            if (user != null)
            {
                _mapper.Map(dto, user);
                _dbContext.Entry(user).State = EntityState.Modified;
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task ResetUserPassword(string userId, UserResetPasswordDTO dto)
        {
            if (!dto.PasswordHash.Equals(dto.ConfirmPasswordHash))
                throw new ArgumentException($"Confirmed password is different.");

            var user = await _dbContext.Users.FindAsync(userId);
            if (user != null)
            {
                _mapper.Map(dto, user);

                if (!string.IsNullOrEmpty(dto.PasswordHash))
                    user.PasswordHash = _passwordHasher.HashPassword(user, dto.PasswordHash);

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

            var unknownUser = await _dbContext.Users
               .Where(u => u.Email == "unknown@unknown.com")
               .SingleOrDefaultAsync();

            if (unknownUser == null)
                throw new InvalidOperationException("Unknown user not found");

            var unknownUserId = unknownUser.Id;

            var problems = await _dbContext.Problems
                .Where(p => p.RequesterId == userId)
                .ToListAsync();
            _dbContext.Problems.RemoveRange(problems);

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