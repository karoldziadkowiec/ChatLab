using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface IAccountService
    {
        Task Register(RegisterDTO registerDTO);
        Task<string> Login(LoginDTO loginDTO);
        Task<IEnumerable<string>> GetRoles();
        Task MakeAnAdmin(string userId);
        Task MakeAnUser(string userId);
    }
}