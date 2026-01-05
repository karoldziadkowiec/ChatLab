using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<UserDTO> GetUser(string userId);
        Task<IEnumerable<UserDTO>> GetUsers();
        Task<IEnumerable<UserDTO>> GetOnlyUsers();
        Task<IEnumerable<UserDTO>> GetOnlyAdmins();
        Task<string> GetUserRole(string userId);
        Task<int> GetUserCount();
        Task UpdateUser(string userId, UserUpdateDTO userUpdateDTO);
        Task ResetUserPassword(string userId, UserResetPasswordDTO userUpdateDTO);
        Task DeleteUser(string userId);
        Task<IEnumerable<Chat>> GetUserChats(string userId);
        Task<MemoryStream> ExportUsersToCsv();
    }
}