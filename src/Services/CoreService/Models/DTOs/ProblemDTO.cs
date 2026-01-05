namespace ChatLab.CoreService.Models.DTOs
{
    public class ProblemDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime CreationDate { get; set; }
        public bool IsSolved { get; set; }
        public string RequesterId { get; set; }
        public UserDTO? Requester { get; set; }
    }
}