using System.ComponentModel.DataAnnotations;

namespace ChatLab.CoreService.Entities
{
    public class CommunicationTechnology
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(30)]
        public string Name { get; set; }
    }
}