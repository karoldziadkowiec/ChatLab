using System.ComponentModel.DataAnnotations;

namespace ChatLab.CoreService.Models.DTOs
{
    public class UserUpdateDTO
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Location { get; set; }
    }
}
