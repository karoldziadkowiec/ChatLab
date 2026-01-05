using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ChatLab.CoreService.Entities
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ChatId { get; set; }

        [ForeignKey("ChatId")]
        public virtual Chat Chat { get; set; }

        [Required]
        [MaxLength(200)]
        public string Content { get; set; }

        [Required]
        public string SenderId { get; set; }

        [ForeignKey("SenderId")]
        public virtual User Sender { get; set; }

        [Required]
        public string ReceiverId { get; set; }

        [ForeignKey("ReceiverId")]
        public virtual User Receiver { get; set; }

        [Required]
        [DataType(DataType.DateTime)]
        public DateTime Timestamp { get; set; }
    }
}