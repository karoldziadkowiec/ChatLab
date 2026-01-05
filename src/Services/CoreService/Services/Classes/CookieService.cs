using ChatLab.CoreService.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;

namespace ChatLab.CoreService.Services.Classes
{
    public class CookieService : ICookieService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CookieService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task SetCookies(JwtSecurityToken token, string tokenString)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Using only HTTPS
                SameSite = SameSiteMode.Strict,
                Expires = token.ValidTo
            };
            _httpContextAccessor.HttpContext?.Response.Cookies.Append("AuthToken", tokenString, cookieOptions);
            await Task.CompletedTask;
        }
    }
}