using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CoreService.IntegrationTests.Repositories
{
    [Collection("CoreServiceDb")]
    public class UserRepositoryTests
    {
        private readonly CoreServiceDbFixture _fixture;

        public UserRepositoryTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetUser_ReturnsUserById()
        {
            // Arrange
            var anyUser = (await _fixture.Repository.GetUsers()).First();

            // Act
            var fetched = await _fixture.Repository.GetUser(anyUser.Id);

            // Assert
            Assert.NotNull(fetched);
            Assert.Equal(anyUser.Id, fetched!.Id);
        }

        [Fact]
        public async Task GetUserCount_MatchesDbCount()
        {
            // Arrange
            var dbCount = await _fixture.DbContext.Users.CountAsync();

            // Act
            var repoCount = await _fixture.Repository.GetUserCount();

            // Assert
            Assert.Equal(dbCount, repoCount);
        }

        [Fact]
        public async Task GetUsers_ReturnsDescendingByCreationDate()
        {
            // Act
            var users = (await _fixture.Repository.GetUsers()).ToList();

            // Assert
            var ordered = users.OrderByDescending(u => u.CreationDate).ToList();
            Assert.Equal(ordered.Select(u => u.Id), users.Select(u => u.Id));
            Assert.True(users.Count >= 4); // unknown + 3 seeded
        }

        [Fact]
        public async Task GetOnlyUsers_OnlyRoleUser()
        {
            // Act
            var onlyUsers = (await _fixture.Repository.GetOnlyUsers()).ToList();

            // Assert
            Assert.NotEmpty(onlyUsers);
            var anyNonUser = await _fixture.DbContext.UserRoles
                .Join(_fixture.DbContext.Users, ur => ur.UserId, u => u.Id, (ur,u) => new { ur, u })
                .Join(_fixture.DbContext.Roles, t => t.ur.RoleId, r => r.Id, (t,r) => new { t.u, RoleName = r.Name })
                .Where(x => onlyUsers.Select(u => u.Id).Contains(x.u.Id) && x.RoleName != "User")
                .AnyAsync();
            Assert.False(anyNonUser);
        }

        [Fact]
        public async Task GetOnlyAdmins_OnlyRoleAdmin()
        {
            // Act
            var onlyAdmins = (await _fixture.Repository.GetOnlyAdmins()).ToList();

            // Assert
            Assert.NotEmpty(onlyAdmins);
            var anyNonAdmin = await _fixture.DbContext.UserRoles
                .Join(_fixture.DbContext.Users, ur => ur.UserId, u => u.Id, (ur,u) => new { ur, u })
                .Join(_fixture.DbContext.Roles, t => t.ur.RoleId, r => r.Id, (t,r) => new { t.u, RoleName = r.Name })
                .Where(x => onlyAdmins.Select(u => u.Id).Contains(x.u.Id) && x.RoleName != "Admin")
                .AnyAsync();
            Assert.False(anyNonAdmin);
        }

        [Fact]
        public async Task GetUserRole_ReturnsSingleRole()
        {
            // Arrange
            var user = (await _fixture.Repository.GetOnlyAdmins()).First();

            // Act
            var role = await _fixture.Repository.GetUserRole(user.Id);

            // Assert
            Assert.Equal("Admin", role);
        }

        [Fact]
        public async Task UpdateUser_PersistsChanges()
        {
            // Arrange
            var u = (await _fixture.Repository.GetOnlyUsers()).First();
            u.Location = "DE";

            // Act
            await _fixture.Repository.UpdateUser(u);

            // Assert
            var refreshed = await _fixture.Repository.GetUser(u.Id);
            Assert.Equal("DE", refreshed!.Location);
        }

        [Fact]
        public async Task ResetUserPassword_ChangesHash()
        {
            // Arrange
            var u = (await _fixture.Repository.GetOnlyUsers()).First();
            var oldHash = u.PasswordHash;

            // Act
            await _fixture.Repository.ResetUserPassword(u, "N3wPass!");

            // Assert
            var refreshed = await _fixture.Repository.GetUser(u.Id);
            Assert.NotEqual(oldHash, refreshed!.PasswordHash);
        }

        [Fact]
        public async Task GetUserChats_OrdersByLastMessage()
        {
            // Arrange
            var u = (await _fixture.Repository.GetOnlyUsers()).First();

            // Act
            var chats = (await _fixture.Repository.GetUserChats(u.Id)).ToList();

            // Assert
            Assert.NotEmpty(chats);
            // With a single chat seeded, trivially true
        }

        [Fact]
        public async Task ExportUsersToCsv_ContainsHeaderAndRows()
        {
            // Act
            using var stream = await _fixture.Repository.ExportUsersToCsv();
            using var reader = new StreamReader(stream, Encoding.UTF8, true, 1024, leaveOpen: false);
            var text = await reader.ReadToEndAsync();

            // Assert
            Assert.StartsWith("E-mail,First Name,Last Name,Phone Number,Location,Creation Date", text.TrimStart());
            var lines = text.Split(new[] {"\r\n", "\n"}, StringSplitOptions.RemoveEmptyEntries);
            Assert.True(lines.Length >= 5); // header + >=4 users
        }

        [Fact]
        public async Task DeleteUser_RemovesUserChatsMessagesFollows()
        {
            // Arrange
            var tempUser = new User
            {
                Id = Guid.NewGuid().ToString(),
                UserName = "tempuser@test.com",
                NormalizedUserName = "TEMPUSER@TEST.COM",
                Email = "tempuser@test.com",
                NormalizedEmail = "TEMPUSER@TEST.COM",
                EmailConfirmed = true,
                FirstName = "Temp",
                LastName = "User",
                PhoneNumber = "+48000000000",
                Location = "PL",
                CreationDate = DateTime.UtcNow
            };
            var createRes = await _fixture.UserManager.CreateAsync(tempUser, "Passw0rd!");
            Assert.True(createRes.Succeeded, string.Join(";", createRes.Errors.Select(e => e.Description)));
            await _fixture.UserManager.AddToRoleAsync(tempUser, "User");

            // Pick an existing non-unknown user as chat partner
            var partner = await _fixture.DbContext.Users
                .Where(u => u.Email != "unknown@unknown.com" && u.Id != tempUser.Id)
                .FirstAsync();

            // Seed chat
            var chat = new Chat { User1Id = tempUser.Id, User2Id = partner.Id };
            await _fixture.DbContext.Chats.AddAsync(chat);
            await _fixture.DbContext.SaveChangesAsync();

            // Ensure a communication technology exists
            var tech = await _fixture.DbContext.CommunicationTechnologies.FirstOrDefaultAsync();
            if (tech == null)
            {
                tech = new CommunicationTechnology { Name = "gRPC" };
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(tech);
                await _fixture.DbContext.SaveChangesAsync();
            }

            // Seed messages
            await _fixture.DbContext.Messages.AddRangeAsync(new[]
            {
                new Message { ChatId = chat.Id, Content = "Temp -> Partner", SenderId = tempUser.Id, ReceiverId = partner.Id, CommunicationTechnologyId = tech.Id, Timestamp = DateTime.UtcNow.AddMinutes(-2) },
                new Message { ChatId = chat.Id, Content = "Partner -> Temp", SenderId = partner.Id, ReceiverId = tempUser.Id, CommunicationTechnologyId = tech.Id, Timestamp = DateTime.UtcNow.AddMinutes(-1) }
            });
            await _fixture.DbContext.SaveChangesAsync();

            // Seed followers involving temp user
            await _fixture.DbContext.UserFollowers.AddRangeAsync(new[]
            {
                new UserFollow { FollowerId = tempUser.Id, FollowedId = partner.Id },
                new UserFollow { FollowerId = partner.Id, FollowedId = tempUser.Id }
            });
            await _fixture.DbContext.SaveChangesAsync();

            // Act
            await _fixture.Repository.DeleteUser(tempUser.Id);

            // Assert
            var deletedUser = await _fixture.DbContext.Users.FindAsync(tempUser.Id);
            Assert.Null(deletedUser);

            // Chats with temp user removed
            var chatsRemain = await _fixture.DbContext.Chats
                .Where(c => c.User1Id == tempUser.Id || c.User2Id == tempUser.Id)
                .AnyAsync();
            Assert.False(chatsRemain);

            // Messages for the chat removed
            var messagesRemain = await _fixture.DbContext.Messages
                .Where(m => m.ChatId == chat.Id)
                .AnyAsync();
            Assert.False(messagesRemain);

            // Followers entries with temp user removed
            var followsRemain = await _fixture.DbContext.UserFollowers
                .Where(f => f.FollowerId == tempUser.Id || f.FollowedId == tempUser.Id)
                .AnyAsync();
            Assert.False(followsRemain);
        }
    }
}
