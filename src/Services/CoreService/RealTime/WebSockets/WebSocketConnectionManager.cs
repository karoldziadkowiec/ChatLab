using System.Collections.Concurrent;
using System.Net.WebSockets;

public class WebSocketConnectionManager
{
    // All sockets by connectionId
    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();

    // Groups: chatId -> (connectionId -> WebSocket)
    private readonly ConcurrentDictionary<int, ConcurrentDictionary<string, WebSocket>> _groups = new();

    // Connection metadata: connectionId -> (chatId, userId)
    private readonly ConcurrentDictionary<string, (int chatId, string userId)> _metadata = new();

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

        // Remove connection metadata
        _metadata.TryRemove(connectionId, out _);

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

    public void SetConnectionMeta(string connectionId, int chatId, string userId)
    {
        _metadata[connectionId] = (chatId, userId);
    }

    public bool TryGetConnectionMeta(string connectionId, out (int chatId, string userId) meta)
    {
        return _metadata.TryGetValue(connectionId, out meta);
    }
}