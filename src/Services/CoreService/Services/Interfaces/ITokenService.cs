using ChatLab.CoreService.Entities;
using System.IdentityModel.Tokens.Jwt;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface ITokenService
    {
        Task<JwtSecurityToken> CreateTokenJWT(User user);
    }
}