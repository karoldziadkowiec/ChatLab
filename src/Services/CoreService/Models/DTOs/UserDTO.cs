namespace ChatLab.CoreService.Models.DTOs
{
    public class UserDTO
    {
        public string Id { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Location { get; set; }
        public DateTime CreationDate { get; set; }
    }
}
