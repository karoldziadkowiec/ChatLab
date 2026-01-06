using ChatLab.CoreService.Entities;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface IUserFollowRepository
    {
        Task<UserFollow> GetUserFollowById(int userFollowId);
        Task<IEnumerable<UserFollow>> GetUserFollowers();
        Task<int> GetUserFollowCount();
        Task<IEnumerable<UserFollow>> GetUserFollowedForUser(string userId);
        Task<int> GetUserFollowedForUserCount(string userId);
        Task<IEnumerable<UserFollow>> GetUserFollowersForUser(string userId);
        Task<int> GetUserFollowersForUserCount(string userId);
        Task<int> GetUserFollowIdBetweenUsers(string followerId, string followedId);
        Task CreateUserFollow(UserFollow userFollow);
        Task RemoveUserFollow(int userFollowId);
    }
}