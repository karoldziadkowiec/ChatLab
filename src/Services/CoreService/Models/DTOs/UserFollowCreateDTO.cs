namespace ChatLab.CoreService.Models.DTOs
{
    public class UserFollowCreateDTO
    {
        public string FollowerId { get; set; }
        public string FollowedId { get; set; }
    }
}