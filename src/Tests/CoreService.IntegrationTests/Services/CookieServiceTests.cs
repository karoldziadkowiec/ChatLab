using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using ChatLab.CoreService.Services.Classes;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace CoreService.IntegrationTests.Services
{
    public class CookieServiceTests
    {
        [Fact]
        public async Task SetCookies_AppendsSecureHttpOnlyStrictCookie()
        {
            // Arrange
            var httpContext = new DefaultHttpContext();
            var accessor = new HttpContextAccessor { HttpContext = httpContext };
            var service = new CookieService(accessor);
            var token = new JwtSecurityToken(expires: DateTime.UtcNow.AddHours(1));
            var tokenString = "abc123";

            // Act
            await service.SetCookies(token, tokenString);

            // Assert
            var setCookie = httpContext.Response.Headers["Set-Cookie"].ToString();
            Assert.Contains("AuthToken=abc123", setCookie);
            Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);
        }
    }
}
