namespace ChatLab.CoreService.SSE
{
    public interface IChatSseService
    {
        void AddClient(string chatId, StreamWriter writer);
        void RemoveClient(string chatId, StreamWriter writer);
        Task SendMessageAsync(string chatId, object message);
    }
}