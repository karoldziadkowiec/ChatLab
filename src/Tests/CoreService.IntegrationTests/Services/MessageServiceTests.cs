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
            var chatId = await _fixture.DbContext.Chats.Select(c => c.Id).FirstAsync();
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
