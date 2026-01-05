using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ChatLab.CoreService.Services.Classes
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;
        private readonly UserManager<User> _userManager;

        public TokenService(IConfiguration configuration, UserManager<User> userManager)
        {
            _configuration = configuration;
            _userManager = userManager;
        }

        public async Task<JwtSecurityToken> CreateTokenJWT(User user)
        {
            var userClaims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles is not null && userRoles.Any())
            {
                userClaims.AddRange(userRoles.Select(userRole => new Claim(ClaimTypes.Role, userRole)));
            }

            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Secret"]));
            var expireDays = _configuration.GetValue<int>("JWT:ExpireDays");
            var credentials = new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _configuration["JWT:ValidIssuer"],
                audience: _configuration["JWT:ValidAudience"],
                expires: DateTime.Now.AddDays(expireDays),
                claims: userClaims,
                signingCredentials: credentials
                );

            return token;
        }
    }
}