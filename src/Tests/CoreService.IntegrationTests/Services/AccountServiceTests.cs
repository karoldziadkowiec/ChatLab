using System;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Classes;
using ChatLab.CoreService.Services.Interfaces;
using CoreService.IntegrationTests.Fixtures;
using CoreService.IntegrationTests.Services.Fakes;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CoreService.IntegrationTests.Services
{
    [Collection("CoreServiceDb")]
    public class AccountServiceTests
    {
        private readonly CoreServiceDbFixture _fixture;
        private readonly IMapper _mapper;

        public AccountServiceTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
            var cfg = new MapperConfiguration(cfg => cfg.AddProfile(new MappingProfile()), NullLoggerFactory.Instance);
            _mapper = cfg.CreateMapper();
        }

        private AccountService CreateWithFakes(ITokenService? tokenSvc = null, ICookieService? cookieSvc = null)
        {
            return new AccountService(_fixture.DbContext, _fixture.UserManager, _mapper, _fixture.RoleManager, tokenSvc ?? new FakeTokenService(), cookieSvc ?? new FakeCookieService());
        }

        [Fact]
        public async Task Register_CreatesUser_AndAssignsUserRole()
        {
            // Arrange
            var svc = CreateWithFakes();
            var email = $"newuser_{Guid.NewGuid():N}@test.com";
            var dto = new RegisterDTO
            {
                Email = email,
                FirstName = "Jan",
                LastName = "Kowalski",
                PhoneNumber = "+48123456789",
                Location = "PL",
                Password = "Passw0rd!",
                ConfirmPassword = "Passw0rd!"
            };

            // Act
            await svc.Register(dto);

            // Assert
            var user = await _fixture.UserManager.FindByEmailAsync(email);
            Assert.NotNull(user);
            Assert.True(await _fixture.UserManager.IsInRoleAsync(user!, "User"));
        }

        [Fact]
        public async Task Register_Fails_OnDuplicateEmail()
        {
            // Arrange
            var svc = CreateWithFakes();
            var existing = (await _fixture.UserManager.GetUsersInRoleAsync("User")).First();
            var dto = new RegisterDTO
            {
                Email = existing.Email!,
                FirstName = "X",
                LastName = "Y",
                PhoneNumber = "+48123456789",
                Location = "PL",
                Password = "Passw0rd!",
                ConfirmPassword = "Passw0rd!"
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => svc.Register(dto));
        }

        [Fact]
        public async Task Register_Fails_OnPasswordMismatch()
        {
            // Arrange
            var svc = CreateWithFakes();
            var dto = new RegisterDTO
            {
                Email = $"mismatch_{Guid.NewGuid():N}@test.com",
                FirstName = "A",
                LastName = "B",
                PhoneNumber = "+48123456789",
                Location = "PL",
                Password = "Passw0rd!",
                ConfirmPassword = "Passw0rd!!"
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => svc.Register(dto));
        }

        [Fact]
        public async Task Login_ReturnsToken_AndSetsCookie()
        {
            // Arrange
            var cookie = new FakeCookieService();
            var svc = CreateWithFakes(tokenSvc: new FakeTokenService(), cookieSvc: cookie);
            var email = $"login_{Guid.NewGuid():N}@test.com";
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                UserName = email,
                NormalizedEmail = email.ToUpperInvariant(),
                NormalizedUserName = email.ToUpperInvariant(),
                FirstName = "A",
                LastName = "B",
                PhoneNumber = "+48123456789",
                Location = "PL",
                CreationDate = DateTime.UtcNow
            };
            var create = await _fixture.UserManager.CreateAsync(user, "Passw0rd!");
            Assert.True(create.Succeeded, string.Join(";", create.Errors.Select(e => e.Description)));

            // Act
            var tokenString = await svc.Login(new LoginDTO { Email = email, Password = "Passw0rd!" });

            // Assert
            Assert.False(string.IsNullOrWhiteSpace(tokenString));
            Assert.Equal(cookie.LastTokenString, tokenString);
            Assert.NotNull(cookie.LastToken);
        }

        [Fact]
        public async Task GetRoles_ReturnsSeededRoles()
        {
            // Arrange
            var svc = CreateWithFakes();

            // Act
            var roles = (await svc.GetRoles()).ToList();

            // Assert
            Assert.Contains("Admin", roles);
            Assert.Contains("User", roles);
        }

        [Fact]
        public async Task MakeAnAdmin_AddsAdmin_RemovesUser()
        {
            // Arrange
            var svc = CreateWithFakes();
            var user = (await _fixture.UserManager.GetUsersInRoleAsync("User")).First(u => u.Email != "unknown@unknown.com");

            // Act
            await svc.MakeAnAdmin(user.Id);

            // Assert
            Assert.True(await _fixture.UserManager.IsInRoleAsync(user, "Admin"));
            Assert.False(await _fixture.UserManager.IsInRoleAsync(user, "User"));
        }

        [Fact]
        public async Task MakeAnUser_AddsUser_RemovesAdmin()
        {
            // Arrange
            var svc = CreateWithFakes();
            var admin = (await _fixture.UserManager.GetUsersInRoleAsync("Admin")).First();

            // Act
            await svc.MakeAnUser(admin.Id);

            // Assert
            Assert.True(await _fixture.UserManager.IsInRoleAsync(admin, "User"));
            Assert.False(await _fixture.UserManager.IsInRoleAsync(admin, "Admin"));
        }
    }
}
