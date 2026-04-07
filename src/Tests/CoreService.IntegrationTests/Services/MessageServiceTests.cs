using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Classes;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CoreService.IntegrationTests.Services
{
    [Collection("CoreServiceDb")]
    public class MessageServiceTests
    {
        private readonly CoreServiceDbFixture _fixture;

        public MessageServiceTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        private MessageService CreateSvc() => new MessageService(_fixture.DbContext);

        [Fact]
        public async Task GetMessageById_ReturnsWithIncludes()
        {
            // Arrange
            var existing = await _fixture.DbContext.Messages.FirstAsync();
            var svc = CreateSvc();

            // Act
            var msg = await svc.GetMessageById(existing.Id);

            // Assert
            Assert.NotNull(msg);
            Assert.NotNull(msg!.Chat);
            Assert.NotNull(msg!.Sender);
            Assert.NotNull(msg!.Receiver);
            Assert.NotNull(msg!.CommunicationTechnology);
        }

        [Fact]
        public async Task GetAllMessages_ReturnsAscendingByTimestamp()
        {
            // Arrange
            var svc = CreateSvc();

            // Act
            var list = (await svc.GetAllMessages()).ToList();

            // Assert
            Assert.NotEmpty(list);
            var ordered = list.OrderBy(m => m.Timestamp).Select(m => m.Id).ToList();
            Assert.Equal(ordered, list.Select(m => m.Id).ToList());
        }

        [Fact]
        public async Task GetAllMessagesCount_MatchesDb()
        {
            // Arrange
            var expected = await _fixture.DbContext.Messages.CountAsync();
            var svc = CreateSvc();

            // Act
            var count = await svc.GetAllMessagesCount();

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetMessagesForChat_ReturnsOnlyThatChat_Ascending()
        {
            // Arrange
            var chatId = await _fixture.DbContext.Chats.Select(c => c.Id).FirstAsync();
            var svc = CreateSvc();

            // Act
            var list = (await svc.GetMessagesForChat(chatId)).ToList();

            // Assert
            Assert.True(list.All(m => m.ChatId == chatId));
            var ordered = list.OrderBy(m => m.Timestamp).Select(m => m.Id).ToList();
            Assert.Equal(ordered, list.Select(m => m.Id).ToList());
        }

        [Fact]
        public async Task GetMessagesForChatAfterId_ReturnsOnlyNewerIds_ForThatChat_AscendingById()
        {
            // Arrange
            var users = await _fixture.DbContext.Users
                .Where(u => u.Email != "unknown@unknown.com")
                .Take(2)
                .ToListAsync();
            var user1 = users[0];
            var user2 = users[1];

            var chat = new Chat { User1Id = user1.Id, User2Id = user2.Id };
            await _fixture.DbContext.Chats.AddAsync(chat);
            await _fixture.DbContext.SaveChangesAsync();

            var tech = await _fixture.DbContext.CommunicationTechnologies.FirstOrDefaultAsync();
            if (tech == null)
            {
                tech = new CommunicationTechnology { Name = "gRPC" };
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(tech);
                await _fixture.DbContext.SaveChangesAsync();
            }

            var m1 = new Message
            {
                ChatId = chat.Id,
                SenderId = user1.Id,
                ReceiverId = user2.Id,
                CommunicationTechnologyId = tech.Id,
                Content = $"afterId_m1_{Guid.NewGuid():N}",
                Timestamp = DateTime.UtcNow.AddSeconds(-3)
            };
            var m2 = new Message
            {
                ChatId = chat.Id,
                SenderId = user2.Id,
                ReceiverId = user1.Id,
                CommunicationTechnologyId = tech.Id,
                Content = $"afterId_m2_{Guid.NewGuid():N}",
                Timestamp = DateTime.UtcNow.AddSeconds(-2)
            };
            var m3 = new Message
            {
                ChatId = chat.Id,
                SenderId = user1.Id,
                ReceiverId = user2.Id,
                CommunicationTechnologyId = tech.Id,
                Content = $"afterId_m3_{Guid.NewGuid():N}",
                Timestamp = DateTime.UtcNow.AddSeconds(-1)
            };
            await _fixture.DbContext.Messages.AddRangeAsync(m1, m2, m3);
            await _fixture.DbContext.SaveChangesAsync();

            // Noise: message in another chat should not be returned
            var otherChat = new Chat { User1Id = user1.Id, User2Id = user2.Id };
            await _fixture.DbContext.Chats.AddAsync(otherChat);
            await _fixture.DbContext.SaveChangesAsync();
            await _fixture.DbContext.Messages.AddAsync(new Message
            {
                ChatId = otherChat.Id,
                SenderId = user1.Id,
                ReceiverId = user2.Id,
                CommunicationTechnologyId = tech.Id,
                Content = $"afterId_other_{Guid.NewGuid():N}",
                Timestamp = DateTime.UtcNow
            });
            await _fixture.DbContext.SaveChangesAsync();

            var svc = CreateSvc();

            // Act
            var list = (await svc.GetMessagesForChatAfterId(chat.Id, m1.Id)).ToList();

            // Assert
            Assert.Equal(new[] { m2.Id, m3.Id }, list.Select(m => m.Id).ToArray());
            Assert.All(list, m =>
            {
                Assert.Equal(chat.Id, m.ChatId);
                Assert.True(m.Id > m1.Id);
                Assert.NotNull(m.CommunicationTechnology);
            });
        }

        [Fact]
        public async Task GetMessagesForChatAfterId_ReturnsEmpty_WhenAfterIdBeyondLast()
        {
            // Arrange
            var chatId = await _fixture.DbContext.Messages.Select(m => m.ChatId).FirstAsync();
            var lastId = await _fixture.DbContext.Messages
                .Where(m => m.ChatId == chatId)
                .OrderByDescending(m => m.Id)
                .Select(m => m.Id)
                .FirstOrDefaultAsync();
            var svc = CreateSvc();

            // Act
            var list = (await svc.GetMessagesForChatAfterId(chatId, lastId)).ToList();

            // Assert
            Assert.Empty(list);
        }

        [Fact]
        public async Task GetMessagesForChatCount_MatchesDb()
        {
            // Arrange
            var chatId = await _fixture.DbContext.Chats.Select(c => c.Id).FirstAsync();
            var expected = await _fixture.DbContext.Messages.CountAsync(m => m.ChatId == chatId);
            var svc = CreateSvc();

            // Act
            var count = await svc.GetMessagesForChatCount(chatId);

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetLastMessageDateForChat_ReturnsLatest()
        {
            // Arrange
            var chatId = await _fixture.DbContext.Messages.Select(m => m.ChatId).FirstAsync();
            var expected = await _fixture.DbContext.Messages.Where(m => m.ChatId == chatId).MaxAsync(m => m.Timestamp);
            var svc = CreateSvc();

            // Act
            var last = await svc.GetLastMessageDateForChat(chatId);

            // Assert
            Assert.Equal(expected, last);
        }

        [Fact]
        public async Task SendMessage_PersistsWithTimestamp()
        {
            // Arrange
            var chat = await _fixture.DbContext.Chats.FirstAsync();
            var tech = await _fixture.DbContext.CommunicationTechnologies.FirstOrDefaultAsync();
            if (tech == null)
            {
                tech = new CommunicationTechnology { Name = "gRPC" };
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(tech);
                await _fixture.DbContext.SaveChangesAsync();
            }
            var dto = new MessageSendDTO
            {
                ChatId = chat.Id,
                SenderId = chat.User1Id,
                ReceiverId = chat.User2Id,
                CommunicationTechnologyId = tech.Id,
                Content = "Hello from test"
            };
            var svc = CreateSvc();

            // Act
            var created = await svc.SendMessage(dto);

            // Assert
            Assert.True(created.Id > 0);
            Assert.Equal(dto.ChatId, created.ChatId);
            Assert.Equal(dto.SenderId, created.SenderId);
            Assert.Equal(dto.ReceiverId, created.ReceiverId);
            Assert.Equal(dto.Content, created.Content);
            Assert.NotEqual(default, created.Timestamp);
        }

        [Fact]
        public async Task DeleteMessage_RemovesRow()
        {
            // Arrange
            var chat = await _fixture.DbContext.Chats.FirstAsync();
            var tech = await _fixture.DbContext.CommunicationTechnologies.FirstAsync();
            var message = new Message
            {
                ChatId = chat.Id,
                SenderId = chat.User1Id,
                ReceiverId = chat.User2Id,
                CommunicationTechnologyId = tech.Id,
                Content = "to delete",
                Timestamp = DateTime.UtcNow
            };
            await _fixture.DbContext.Messages.AddAsync(message);
            await _fixture.DbContext.SaveChangesAsync();
            var svc = CreateSvc();

            // Act
            await svc.DeleteMessage(message.Id);

            // Assert
            var exists = await _fixture.DbContext.Messages.AnyAsync(m => m.Id == message.Id);
            Assert.False(exists);
        }
    }
}
