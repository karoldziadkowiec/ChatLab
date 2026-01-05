using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatLab.CoreService.Entities
{
    public class UserFollow
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string FollowerId { get; set; }

        [ForeignKey("FollowerId ")]
        public virtual User Follower { get; set; }

        [Required]
        public string FollowedId { get; set; }

        [ForeignKey("FollowedId ")]
        public virtual User Followed { get; set; }
    }
}