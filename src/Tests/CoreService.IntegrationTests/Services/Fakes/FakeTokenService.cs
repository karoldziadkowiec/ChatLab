using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Interfaces;

namespace CoreService.IntegrationTests.Services.Fakes
{
    public class FakeTokenService : ITokenService
    {
        public Task<JwtSecurityToken> CreateTokenJWT(User user)
        {
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, user.Id), new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) };
            var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddDays(1));
            return Task.FromResult(token);
        }
    }
}
