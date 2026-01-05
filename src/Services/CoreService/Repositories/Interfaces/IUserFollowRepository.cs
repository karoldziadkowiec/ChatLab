using ChatLab.CoreService.Entities;

namespace ChatLab.CoreService.Services.Interfaces
{
    public interface IUserFollowRepository
    {
        Task<UserFollow> GetUserFollowById(int userFollowId);
        Task<IEnumerable<UserFollow>> GetUserFollowers();
        Task<int> GetUserFollowCount();
        Task<int> GetUserFollowIdBetweenUsers(string followerId, string followedId);
        Task CreateUserFollow(UserFollow userFollow);
        Task RemoveUserFollow(int userFollowId);
    }
}