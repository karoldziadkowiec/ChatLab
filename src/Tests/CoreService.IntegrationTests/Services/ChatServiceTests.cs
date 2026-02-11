using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Classes;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CoreService.IntegrationTests.Services
{
    [Collection("CoreServiceDb")]
    public class ChatServiceTests
    {
        private readonly CoreServiceDbFixture _fixture;

        public ChatServiceTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        private ChatService CreateSvc() => new ChatService(_fixture.DbContext);

        [Fact]
        public async Task GetChatById_ReturnsChatWithUsers()
        {
            // Arrange
            var existing = await _fixture.DbContext.Chats.FirstAsync();
            var svc = CreateSvc();

            // Act
            var chat = await svc.GetChatById(existing.Id);

            // Assert
            Assert.NotNull(chat);
            Assert.NotNull(chat!.User1);
            Assert.NotNull(chat!.User2);
        }

        [Fact]
        public async Task GetChats_ReturnsWithUsers()
        {
            // Arrange
            var svc = CreateSvc();

            // Act
            var chats = (await svc.GetChats()).ToList();

            // Assert
            Assert.NotEmpty(chats);
            Assert.All(chats, c => { Assert.NotNull(c.User1); Assert.NotNull(c.User2); });
        }

        [Fact]
        public async Task GetChatCount_MatchesDb()
        {
            // Arrange
            var expected = await _fixture.DbContext.Chats.CountAsync();
            var svc = CreateSvc();

            // Act
            var count = await svc.GetChatCount();

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetChatIdBetweenUsers_ReturnsId_AndZeroWhenMissing()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(3).ToListAsync();
            var a = users[0]; var b = users[1]; var c = users[2];
            var existing = await _fixture.DbContext.Chats.FirstOrDefaultAsync(x => (x.User1Id == a.Id && x.User2Id == b.Id) || (x.User1Id == b.Id && x.User2Id == a.Id));
            if (existing == null)
            {
                await _fixture.DbContext.Chats.AddAsync(new Chat { User1Id = a.Id, User2Id = b.Id });
                await _fixture.DbContext.SaveChangesAsync();
            }
            var svc = CreateSvc();

            // Act
            var idForward = await svc.GetChatIdBetweenUsers(a.Id, b.Id);
            var idBackward = await svc.GetChatIdBetweenUsers(b.Id, a.Id);
            var idNone = await svc.GetChatIdBetweenUsers(a.Id, c.Id); // assume no chat yet

            // Assert
            Assert.True(idForward > 0);
            Assert.Equal(idForward, idBackward);
            Assert.Equal(0, idNone);
        }

        [Fact]
        public async Task CreateChat_Persists()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(2).ToListAsync();
            var a = users[0]; var b = users[1];
            var svc = CreateSvc();
            var chat = new Chat { User1Id = a.Id, User2Id = b.Id };

            // Act
            await svc.CreateChat(chat);

            // Assert
            var exists = await _fixture.DbContext.Chats.AnyAsync(c => c.Id == chat.Id);
            Assert.True(exists);
        }

        [Fact]
        public async Task DeleteChat_RemovesChatAndMessages()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(2).ToListAsync();
            var a = users[0]; var b = users[1];
            var chat = new Chat { User1Id = a.Id, User2Id = b.Id };
            await _fixture.DbContext.Chats.AddAsync(chat);
            await _fixture.DbContext.SaveChangesAsync();

            var tech = await _fixture.DbContext.CommunicationTechnologies.FirstOrDefaultAsync();
            if (tech == null)
            {
                tech = new CommunicationTechnology { Name = "gRPC" };
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(tech);
                await _fixture.DbContext.SaveChangesAsync();
            }

            await _fixture.DbContext.Messages.AddRangeAsync(new[]
            {
                new Message { ChatId = chat.Id, Content = "x", SenderId = a.Id, ReceiverId = b.Id, CommunicationTechnologyId = tech.Id, Timestamp = DateTime.UtcNow },
                new Message { ChatId = chat.Id, Content = "y", SenderId = b.Id, ReceiverId = a.Id, CommunicationTechnologyId = tech.Id, Timestamp = DateTime.UtcNow }
            });
            await _fixture.DbContext.SaveChangesAsync();

            var svc = CreateSvc();

            // Act
            await svc.DeleteChat(chat.Id);

            // Assert
            Assert.False(await _fixture.DbContext.Chats.AnyAsync(c => c.Id == chat.Id));
            Assert.False(await _fixture.DbContext.Messages.AnyAsync(m => m.ChatId == chat.Id));
        }

        [Fact]
        public async Task ExportChatsToCsv_ReturnsHeaderAndRows()
        {
            // Arrange
            var svc = CreateSvc();

            // Act
            using var stream = await svc.ExportChatsToCsv();
            using var reader = new StreamReader(stream, Encoding.UTF8, true, 1024, leaveOpen: false);
            var text = await reader.ReadToEndAsync();

            // Assert
            Assert.StartsWith("Chat Id,User1 E-mail,User1 First Name,User1 Last Name,User2 E-mail,User2 First Name,User2 Last Name", text.TrimStart());
            var lines = text.Split(new[] {"\r\n", "\n"}, StringSplitOptions.RemoveEmptyEntries);
            Assert.True(lines.Length >= 2); // header + at least 1 row
        }
    }
}
