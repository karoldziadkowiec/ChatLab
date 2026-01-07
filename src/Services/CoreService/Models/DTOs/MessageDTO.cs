namespace ChatLab.CoreService.Models.DTOs
{
    public class MessageDTO
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public ChatDTO? Chat { get; set; }
        public string Content { get; set; }
        public string SenderId { get; set; }
        public UserDTO? Sender { get; set; }
        public string ReceiverId { get; set; }
        public UserDTO? Receiver { get; set; }
        public int CommunicationTechnologyId { get; set; }
        public CommunicationTechnologyDTO? CommunicationTechnology { get; set; }
        public DateTime Timestamp { get; set; }
    }
}