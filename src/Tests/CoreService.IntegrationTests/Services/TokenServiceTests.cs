using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Classes;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CoreService.IntegrationTests.Services
{
    [Collection("CoreServiceDb")]
    public class TokenServiceTests
    {
        private readonly CoreServiceDbFixture _fixture;
        public TokenServiceTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task CreateTokenJWT_ContainsUserIdRoleAndExpiry()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["JWT:Secret"] = "supersecret_supersecret_supersecret_12345",
                    ["JWT:ValidIssuer"] = "test-issuer",
                    ["JWT:ValidAudience"] = "test-audience",
                    ["JWT:ExpireDays"] = "1"
                })
                .Build();
            var user = (await _fixture.UserManager.GetUsersInRoleAsync("User")).First();
            var service = new TokenService(config, _fixture.UserManager);

            // Act
            var token = await service.CreateTokenJWT(user);

            // Assert
            Assert.True(token.ValidTo > DateTime.UtcNow);
            var claims = token.Claims.ToList();
            Assert.Contains(claims, c => c.Type.EndsWith("nameidentifier", StringComparison.OrdinalIgnoreCase) && c.Value == user.Id);
            Assert.Contains(claims, c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase) && c.Value == "User");
        }
    }
}
