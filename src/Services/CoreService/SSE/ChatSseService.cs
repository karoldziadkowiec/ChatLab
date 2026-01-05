using System.Collections.Concurrent;

namespace ChatLab.CoreService.SSE
{
    public class ChatSseService : IChatSseService
    {
        private readonly ConcurrentDictionary<string, List<StreamWriter>> _clients =
            new ConcurrentDictionary<string, List<StreamWriter>>();

        public void AddClient(string chatId, StreamWriter writer)
        {
            var list = _clients.GetOrAdd(chatId, _ => new List<StreamWriter>());
            lock (list) list.Add(writer);
        }

        public void RemoveClient(string chatId, StreamWriter writer)
        {
            if (_clients.TryGetValue(chatId, out var list))
            {
                lock (list) list.Remove(writer);
            }
        }

        public async Task SendMessageAsync(string chatId, object message)
        {
            if (!_clients.TryGetValue(chatId, out var list)) return;

            var json = System.Text.Json.JsonSerializer.Serialize(message);

            List<StreamWriter> failed = new();

            lock (list)
            {
                foreach (var client in list)
                {
                    try
                    {
                        client.WriteLine($"data: {json}");
                        client.WriteLine();
                        client.Flush();
                    }
                    catch
                    {
                        failed.Add(client);
                    }
                }

                // czyść nieaktywne
                foreach (var f in failed)
                    list.Remove(f);
            }
        }
    }
}