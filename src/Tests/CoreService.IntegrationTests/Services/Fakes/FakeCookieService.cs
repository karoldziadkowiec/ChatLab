using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;
using ChatLab.CoreService.Services.Interfaces;

namespace CoreService.IntegrationTests.Services.Fakes
{
    public class FakeCookieService : ICookieService
    {
        public JwtSecurityToken? LastToken { get; private set; }
        public string? LastTokenString { get; private set; }

        public Task SetCookies(JwtSecurityToken token, string tokenString)
        {
            LastToken = token;
            LastTokenString = tokenString;
            return Task.CompletedTask;
        }
    }
}
