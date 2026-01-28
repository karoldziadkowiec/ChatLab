namespace ChatLab.CoreService.RealTime.SSE.Interfaces
{
    public interface IChatSseService
    {
        void AddClient(string chatId, StreamWriter writer);
        void RemoveClient(string chatId, StreamWriter writer);
        Task SendMessageAsync(string chatId, object message);
    }
}