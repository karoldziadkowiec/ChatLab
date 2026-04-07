using ChatLab.CoreService.RealTime.SSE.Interfaces;
using System.Collections.Concurrent;
using System.Text.Json;

namespace ChatLab.CoreService.RealTime.SSE.Classes
{
    public class ChatSseService : IChatSseService
    {
        private static readonly JsonSerializerOptions SseJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

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

            var json = JsonSerializer.Serialize(message, SseJsonOptions);

            List<StreamWriter> snapshot;
            lock (list)
            {
                snapshot = list.ToList();
            }

            List<StreamWriter> failed = new();
            foreach (var client in snapshot)
            {
                try
                {
                    await client.WriteLineAsync($"data: {json}");
                    await client.WriteLineAsync();
                    await client.FlushAsync();
                }
                catch
                {
                    failed.Add(client);
                }
            }

            if (failed.Count > 0)
            {
                lock (list)
                {
                    foreach (var f in failed)
                        list.Remove(f);
                }
            }
        }
    }
}