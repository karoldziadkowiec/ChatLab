using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ChatLab.CoreService.Entities
{
    public class Problem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(30)]
        public string Title { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; }

        [Required]
        [DataType(DataType.DateTime)]
        public DateTime CreationDate { get; set; }

        [Required]
        public bool IsSolved { get; set; }

        [Required]
        public string RequesterId { get; set; }

        [ForeignKey("RequesterId")]
        public virtual User Requester { get; set; }
    }
}