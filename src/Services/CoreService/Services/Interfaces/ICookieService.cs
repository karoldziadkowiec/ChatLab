using System.IdentityModel.Tokens.Jwt;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface ICookieService
    {
        Task SetCookies(JwtSecurityToken token, string tokenString);
    }
}