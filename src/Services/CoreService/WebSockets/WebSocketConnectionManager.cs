using System.Collections.Concurrent;
using System.Net.WebSockets;

public class WebSocketConnectionManager
{
    // Wszystkie sockety po connectionId
    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();

    // Grupy: chatId -> (connectionId -> WebSocket)
    private readonly ConcurrentDictionary<int, ConcurrentDictionary<string, WebSocket>> _groups = new();

    public void AddSocket(string connectionId, WebSocket socket)
    {
        _sockets.TryAdd(connectionId, socket);
    }

    public async Task RemoveSocketAsync(string connectionId)
    {
        if (_sockets.TryRemove(connectionId, out var socket))
        {
            try { await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed by server", CancellationToken.None); } catch { }
        }

        foreach (var kv in _groups)
        {
            kv.Value.TryRemove(connectionId, out _);
        }
    }

    public void AddToGroup(int chatId, string connectionId, WebSocket socket)
    {
        var group = _groups.GetOrAdd(chatId, _ => new ConcurrentDictionary<string, WebSocket>());
        group.TryAdd(connectionId, socket);
    }

    public void RemoveFromGroup(int chatId, string connectionId)
    {
        if (_groups.TryGetValue(chatId, out var group))
        {
            group.TryRemove(connectionId, out _);
            if (group.IsEmpty)
            {
                _groups.TryRemove(chatId, out _);
            }
        }
    }

    public IEnumerable<WebSocket> GetGroupSockets(int chatId)
    {
        if (_groups.TryGetValue(chatId, out var group))
        {
            return group.Values.Where(s => s.State == WebSocketState.Open);
        }
        return Enumerable.Empty<WebSocket>();
    }
}