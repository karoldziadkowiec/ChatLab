namespace ChatLab.CoreService.Models.DTOs
{
    public class ChatDTO
    {
        public int Id { get; set; }
        public string User1Id { get; set; }
        public UserDTO? User1 { get; set; }
        public string User2Id { get; set; }
        public UserDTO? User2 { get; set; }
    }
}