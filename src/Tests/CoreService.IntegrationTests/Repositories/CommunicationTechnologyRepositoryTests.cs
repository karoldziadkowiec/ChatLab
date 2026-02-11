using System;
using System.Linq;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Repositories.Classes;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CoreService.IntegrationTests.Repositories
{
    [Collection("CoreServiceDb")]
    public class CommunicationTechnologyRepositoryTests
    {
        private readonly CoreServiceDbFixture _fixture;

        public CommunicationTechnologyRepositoryTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        private CommunicationTechnologyRepository CreateRepo() => new CommunicationTechnologyRepository(_fixture.DbContext);

        [Fact]
        public async Task GetCommunicationTechnologies_ReturnsAll()
        {
            // Arrange
            if (!await _fixture.DbContext.CommunicationTechnologies.AnyAsync(ct => ct.Name == "SignalR"))
            {
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(new CommunicationTechnology { Name = "SignalR" });
                await _fixture.DbContext.SaveChangesAsync();
            }
            var repo = CreateRepo();

            // Act
            var list = (await repo.GetCommunicationTechnologies()).ToList();

            // Assert
            Assert.NotEmpty(list);
            Assert.Contains(list, x => x.Name == "SignalR" || x.Name == "gRPC");
        }

        [Fact]
        public async Task GetCommunicationTechnologyCount_MatchesDb()
        {
            // Arrange
            var expected = await _fixture.DbContext.CommunicationTechnologies.CountAsync();
            var repo = CreateRepo();

            // Act
            var count = await repo.GetCommunicationTechnologyCount();

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetCommunicationTechnologyId_ByName()
        {
            // Arrange
            var name = "WebSockets";
            if (!await _fixture.DbContext.CommunicationTechnologies.AnyAsync(ct => ct.Name == name))
            {
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(new CommunicationTechnology { Name = name });
                await _fixture.DbContext.SaveChangesAsync();
            }
            var repo = CreateRepo();

            // Act
            var id = await repo.GetCommunicationTechnologyId(name);

            // Assert
            Assert.True(id > 0);
        }

        [Fact]
        public async Task GetCommunicationTechnologyName_ById()
        {
            // Arrange
            var entity = await _fixture.DbContext.CommunicationTechnologies.FirstOrDefaultAsync(ct => ct.Name == "gRPC");
            if (entity == null)
            {
                entity = new CommunicationTechnology { Name = "gRPC" };
                await _fixture.DbContext.CommunicationTechnologies.AddAsync(entity);
                await _fixture.DbContext.SaveChangesAsync();
            }
            var repo = CreateRepo();

            // Act
            var name = await repo.GetCommunicationTechnologyName(entity.Id);

            // Assert
            Assert.Equal("gRPC", name);
        }

        [Fact]
        public async Task CheckCommunicationTechnologyExists_TrueFalse()
        {
            // Arrange
            var repo = CreateRepo();

            // Act
            var existsGrpc = await repo.CheckCommunicationTechnologyExists("gRPC");
            var existsFoo = await repo.CheckCommunicationTechnologyExists("foo-bar-baz");

            // Assert
            Assert.True(existsGrpc);
            Assert.False(existsFoo);
        }

        [Fact]
        public async Task CreateCommunicationTechnology_Persists()
        {
            // Arrange
            var repo = CreateRepo();
            var unique = ("Tech-" + Guid.NewGuid().ToString("N")).Substring(0, Math.Min(30, ("Tech-" + Guid.NewGuid().ToString("N")).Length));
            var entity = new CommunicationTechnology { Name = unique };

            // Act
            await repo.CreateCommunicationTechnology(entity);

            // Assert
            var exists = await _fixture.DbContext.CommunicationTechnologies.AnyAsync(ct => ct.Name == unique);
            Assert.True(exists);
        }

        [Fact]
        public async Task CreateCommunicationTechnology_Throws_OnDuplicate()
        {
            // Arrange
            var repo = CreateRepo();
            var dup = ("DupTech-" + Guid.NewGuid().ToString("N")).Substring(0, Math.Min(30, ("DupTech-" + Guid.NewGuid().ToString("N")).Length));
            _fixture.DbContext.CommunicationTechnologies.Add(new CommunicationTechnology { Name = dup });
            await _fixture.DbContext.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => repo.CreateCommunicationTechnology(new CommunicationTechnology { Name = dup }));
        }
    }
}
