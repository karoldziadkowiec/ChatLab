namespace ChatLab.CoreService.Models.DTOs
{
    public class UserFollowDTO
    {
        public int Id { get; set; }
        public string FollowerId { get; set; }
        public UserDTO? Follower { get; set; }
        public string FollowedId { get; set; }
        public UserDTO? Followed { get; set; }
    }
}