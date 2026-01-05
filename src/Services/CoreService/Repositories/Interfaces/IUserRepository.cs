using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetUser(string userId);
        Task<IEnumerable<User>> GetUsers();
        Task<IEnumerable<User>> GetOnlyUsers();
        Task<IEnumerable<User>> GetOnlyAdmins();
        Task<string?> GetUserRole(string userId);
        Task<int> GetUserCount();
        Task UpdateUser(User user);
        Task ResetUserPassword(User user, string newPassword);
        Task DeleteUser(string userId);
        Task<IEnumerable<Chat>> GetUserChats(string userId);
        Task<IEnumerable<UserFollow>> GetUserFollowersForUser(string userId);
        Task<MemoryStream> ExportUsersToCsv();
    }
}