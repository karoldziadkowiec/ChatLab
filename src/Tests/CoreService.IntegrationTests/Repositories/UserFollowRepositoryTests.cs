using System;
using System.Linq;
using System.Threading.Tasks;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Classes;
using CoreService.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CoreService.IntegrationTests.Repositories
{
    [Collection("CoreServiceDb")]
    public class UserFollowRepositoryTests
    {
        private readonly CoreServiceDbFixture _fixture;

        public UserFollowRepositoryTests(CoreServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        private UserFollowRepository CreateRepo() => new UserFollowRepository(_fixture.DbContext);

        [Fact]
        public async Task GetUserFollowers_ReturnsAllWithIncludes()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(3).ToListAsync();
            var a = users[0]; var b = users[1]; var c = users[2];
            await _fixture.DbContext.UserFollowers.AddRangeAsync(
                new UserFollow { FollowerId = a.Id, FollowedId = b.Id },
                new UserFollow { FollowerId = c.Id, FollowedId = a.Id }
            );
            await _fixture.DbContext.SaveChangesAsync();
            var repo = CreateRepo();

            // Act
            var all = (await repo.GetUserFollowers()).ToList();

            // Assert
            Assert.True(all.Count >= 2);
            Assert.All(all, uf => { Assert.NotNull(uf.Follower); Assert.NotNull(uf.Followed); });
        }

        [Fact]
        public async Task GetUserFollowCount_MatchesDb()
        {
            // Arrange
            var expected = await _fixture.DbContext.UserFollowers.CountAsync();
            var repo = CreateRepo();

            // Act
            var count = await repo.GetUserFollowCount();

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetUserFollowedForUser_FiltersByFollower()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(3).ToListAsync();
            var follower = users[0]; var followed1 = users[1]; var followed2 = users[2];
            await _fixture.DbContext.UserFollowers.AddRangeAsync(
                new UserFollow { FollowerId = follower.Id, FollowedId = followed1.Id },
                new UserFollow { FollowerId = follower.Id, FollowedId = followed2.Id }
            );
            await _fixture.DbContext.SaveChangesAsync();
            var repo = CreateRepo();

            // Act
            var list = (await repo.GetUserFollowedForUser(follower.Id)).ToList();

            // Assert
            Assert.True(list.Count >= 2);
            Assert.All(list, uf => Assert.Equal(follower.Id, uf.FollowerId));
        }

        [Fact]
        public async Task GetUserFollowedForUserCount_Matches()
        {
            // Arrange
            var any = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").FirstAsync();
            var expected = await _fixture.DbContext.UserFollowers.CountAsync(f => f.FollowerId == any.Id);
            var repo = CreateRepo();

            // Act
            var count = await repo.GetUserFollowedForUserCount(any.Id);

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetUserFollowersForUser_FiltersByFollowed()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(3).ToListAsync();
            var target = users[0]; var f1 = users[1]; var f2 = users[2];
            await _fixture.DbContext.UserFollowers.AddRangeAsync(
                new UserFollow { FollowerId = f1.Id, FollowedId = target.Id },
                new UserFollow { FollowerId = f2.Id, FollowedId = target.Id }
            );
            await _fixture.DbContext.SaveChangesAsync();
            var repo = CreateRepo();

            // Act
            var list = (await repo.GetUserFollowersForUser(target.Id)).ToList();

            // Assert
            Assert.True(list.Count >= 2);
            Assert.All(list, uf => Assert.Equal(target.Id, uf.FollowedId));
        }

        [Fact]
        public async Task GetUserFollowersForUserCount_Matches()
        {
            // Arrange
            var any = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").FirstAsync();
            var expected = await _fixture.DbContext.UserFollowers.CountAsync(f => f.FollowedId == any.Id);
            var repo = CreateRepo();

            // Act
            var count = await repo.GetUserFollowersForUserCount(any.Id);

            // Assert
            Assert.Equal(expected, count);
        }

        [Fact]
        public async Task GetUserFollowIdBetweenUsers_ReturnsId_BothDirections()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(2).ToListAsync();
            var a = users[0]; var b = users[1];
            var row = new UserFollow { FollowerId = a.Id, FollowedId = b.Id };
            await _fixture.DbContext.UserFollowers.AddAsync(row);
            await _fixture.DbContext.SaveChangesAsync();
            var repo = CreateRepo();

            // Act
            var idForward = await repo.GetUserFollowIdBetweenUsers(a.Id, b.Id);
            var idBackward = await repo.GetUserFollowIdBetweenUsers(b.Id, a.Id);
            var idNone = await repo.GetUserFollowIdBetweenUsers(a.Id, a.Id);

            // Assert
            Assert.True(idForward > 0);
            Assert.Equal(idForward, idBackward);
            var found = await _fixture.DbContext.UserFollowers.FindAsync(idForward);
            Assert.NotNull(found);
            Assert.True(
                (found!.FollowerId == a.Id && found.FollowedId == b.Id) ||
                (found.FollowerId == b.Id && found.FollowedId == a.Id)
            );
            Assert.Equal(0, idNone);
        }

        [Fact]
        public async Task CreateUserFollow_Persists()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(2).ToListAsync();
            var a = users[0]; var b = users[1];
            var repo = CreateRepo();
            var uf = new UserFollow { FollowerId = a.Id, FollowedId = b.Id };

            // Act
            await repo.CreateUserFollow(uf);

            // Assert
            var exists = await _fixture.DbContext.UserFollowers.AnyAsync(x => x.Id == uf.Id);
            Assert.True(exists);
        }

        [Fact]
        public async Task RemoveUserFollow_DeletesRow()
        {
            // Arrange
            var users = await _fixture.DbContext.Users.Where(u => u.Email != "unknown@unknown.com").Take(2).ToListAsync();
            var a = users[0]; var b = users[1];
            var row = new UserFollow { FollowerId = a.Id, FollowedId = b.Id };
            await _fixture.DbContext.UserFollowers.AddAsync(row);
            await _fixture.DbContext.SaveChangesAsync();
            var repo = CreateRepo();

            // Act
            await repo.RemoveUserFollow(row.Id);

            // Assert
            var exists = await _fixture.DbContext.UserFollowers.AnyAsync(x => x.Id == row.Id);
            Assert.False(exists);
        }

        [Fact]
        public async Task RemoveUserFollow_Throws_WhenNotFound()
        {
            // Arrange
            var repo = CreateRepo();

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => repo.RemoveUserFollow(-12345));
        }
    }
}
