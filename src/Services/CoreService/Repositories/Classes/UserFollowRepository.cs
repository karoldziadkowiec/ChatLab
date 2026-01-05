using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Services.Classes
{
    public class UserFollowRepository : IUserFollowRepository
    {
        private readonly AppDbContext _dbContext;

        public UserFollowRepository(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<UserFollow> GetUserFollowById(int userFollowId)
        {
            return await _dbContext.UserFollowers
                .Include(f => f.Follower)
                .Include(f => f.Followed)
                .FirstOrDefaultAsync(f => f.Id == userFollowId);
        }

        public async Task<IEnumerable<UserFollow>> GetUserFollowers()
        {
            return await _dbContext.UserFollowers
                .Include(f => f.Follower)
                .Include(f => f.Followed)
                .ToListAsync();
        }

        public async Task<int> GetUserFollowCount()
        {
            return await _dbContext.UserFollowers.CountAsync();
        }

        public async Task<int> GetUserFollowIdBetweenUsers(string followerId, string followedId)
        {
            var userFollowId = await _dbContext.UserFollowers
                .Where(f => (f.FollowerId == followerId && f.FollowedId == followedId) || (f.FollowerId == followedId && f.FollowedId == followerId))
                .Select(f => f.Id)
                .FirstOrDefaultAsync();

            return userFollowId;
        }

        public async Task CreateUserFollow(UserFollow userFollow)
        {
            _dbContext.UserFollowers.Add(userFollow);
            await _dbContext.SaveChangesAsync();
        }

        public async Task RemoveUserFollow(int userFollowId)
        {
            var userFollow = await _dbContext.UserFollowers.FirstOrDefaultAsync(f => f.Id == userFollowId);

            if (userFollow == null)
                throw new ArgumentException($"No user follow found with ID {userFollowId}");

            _dbContext.UserFollowers.Remove(userFollow);
            await _dbContext.SaveChangesAsync();
        }
    }
}