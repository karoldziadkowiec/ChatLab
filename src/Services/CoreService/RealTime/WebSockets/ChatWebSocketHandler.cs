using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

public class ChatWebSocketHandler
{
    private readonly WebSocketConnectionManager _connections;
    private readonly IMessageService _messageService;
    private readonly IChatService _chatService;
    private readonly ILogger<ChatWebSocketHandler> _logger;
    private readonly bool _allowNonParticipants;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private const int MaxMessageBytes = 64 * 1024; // maximum message size
    private const int MaxMessagesPerSecond = 10; // simple per-connection rate limit
    private readonly Queue<DateTime> _sendTimestamps = new();
    private int? _joinedChatId = null;
    private string? _userId = null;

    public ChatWebSocketHandler(
        WebSocketConnectionManager connections,
        IMessageService messageService,
        IChatService chatService,
        ILogger<ChatWebSocketHandler> logger,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _connections = connections;
        _messageService = messageService;
        _chatService = chatService;
        _logger = logger;

        // For load/performance testing in Development only: allow any authenticated user to join/send
        // messages in a 1:1 chat without changing the data model.
        _allowNonParticipants = environment.IsDevelopment() && configuration.GetValue<bool>("LoadTesting:AllowNonParticipantsInChats");
    }

    public async Task HandleAsync(WebSocket socket, string connectionId, CancellationToken ct)
    {
        _connections.AddSocket(connectionId, socket);

        var buffer = new byte[8 * 1024];
        using var ms = new MemoryStream();

        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.CloseStatus.HasValue)
                {
                    break;
                }

                if (result.MessageType != WebSocketMessageType.Text)
                {
                    continue;
                }

                ms.Write(buffer, 0, result.Count);

                if (ms.Length > MaxMessageBytes)
                {
                    _logger.LogWarning("Message too large from {ConnectionId}. Closing connection.", connectionId);
                    await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too big", ct);
                    break;
                }

                if (!result.EndOfMessage)
                {
                    continue;
                }

                var received = Encoding.UTF8.GetString(ms.ToArray());
                ms.SetLength(0);
                if (string.IsNullOrWhiteSpace(received))
                {
                    continue;
                }

                JsonDocument doc;
                try { doc = JsonDocument.Parse(received); }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Invalid JSON from {ConnectionId}", connectionId);
                    continue;
                }

                if (!doc.RootElement.TryGetProperty("type", out var typeEl)) continue;
                var type = typeEl.GetString();

                if (type == "join" && doc.RootElement.TryGetProperty("chatId", out var chatIdEl))
                {
                    var chatId = chatIdEl.GetInt32();
                    string? userId = null;
                    if (doc.RootElement.TryGetProperty("userId", out var userIdEl))
                    {
                        userId = userIdEl.GetString();
                    }

                    if (string.IsNullOrWhiteSpace(userId))
                    {
                        _logger.LogWarning("Missing userId in JOIN message from {ConnectionId}", connectionId);
                        await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Missing userId", ct);
                        break;
                    }

                    // Validate chat exists + membership (unless load-testing override is enabled)
                    var chat = await _chatService.GetChatById(chatId);
                    if (chat == null)
                    {
                        _logger.LogWarning("Chat {ChatId} not found. Closing connection {ConnectionId}", chatId, connectionId);
                        var denyJson = JsonSerializer.Serialize(new { type = "error", code = "chat_not_found", message = "Chat not found." });
                        await SafeSendAsync(socket, denyJson, ct);
                        await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Chat not found", ct);
                        break;
                    }

                    if (!_allowNonParticipants)
                    {
                        var isMember = $"{chat.User1Id}" == userId || $"{chat.User2Id}" == userId;
                        if (!isMember)
                        {
                            _logger.LogWarning("User {UserId} is not a member of chat {ChatId}. Closing connection {ConnectionId}", userId, chatId, connectionId);
                            var denyJson = JsonSerializer.Serialize(new { type = "error", code = "not_member", message = "You are not a member of this chat." });
                            await SafeSendAsync(socket, denyJson, ct);
                            await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Not a member of chat", ct);
                            break;
                        }
                    }

                    _joinedChatId = chatId;
                    _userId = userId;
                    _connections.SetConnectionMeta(connectionId, chatId, userId);
                    _connections.AddToGroup(chatId, connectionId, socket);
                    // opcjonalnie powiadomienie: użytkownik dołączył
                    continue;
                }

                if (type == "leave" && doc.RootElement.TryGetProperty("chatId", out chatIdEl))
                {
                    var chatId = chatIdEl.GetInt32();
                    _connections.RemoveFromGroup(chatId, connectionId);
                    continue;
                }

                if (type == "message" && doc.RootElement.TryGetProperty("chatId", out chatIdEl)
                                  && doc.RootElement.TryGetProperty("payload", out var payloadEl))
                {
                    var chatId = chatIdEl.GetInt32();

                    string? clientMessageId = null;
                    if (doc.RootElement.TryGetProperty("clientMessageId", out var clientMessageIdEl))
                    {
                        clientMessageId = clientMessageIdEl.GetString();
                    }

                    // Deserialize payload to MessageSendDTO
                    MessageSendDTO messageSendDto;
                    try
                    {
                        messageSendDto = JsonSerializer.Deserialize<MessageSendDTO>(payloadEl.GetRawText(), _jsonOptions)!;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize payload from {ConnectionId}", connectionId);
                        continue;
                    }

                    // Validate membership and data consistency
                    if (_joinedChatId is null || _userId is null || _joinedChatId != chatId || !string.Equals(messageSendDto.SenderId, _userId, StringComparison.Ordinal))
                    {
                        _logger.LogWarning("Invalid send attempt: connectionId={ConnectionId}, chatId={ChatId}, senderId={SenderId}", connectionId, chatId, messageSendDto.SenderId);
                        var errJson = JsonSerializer.Serialize(new { type = "error", code = "invalid_sender", message = "Invalid sender or chat context." });
                        await SafeSendAsync(socket, errJson, ct);
                        continue;
                    }

                    // Per-connection rate limiting (count in the last second)
                    var now = DateTime.UtcNow;
                    while (_sendTimestamps.Count > 0 && (now - _sendTimestamps.Peek()).TotalSeconds > 1.0)
                    {
                        _sendTimestamps.Dequeue();
                    }
                    if (_sendTimestamps.Count >= MaxMessagesPerSecond)
                    {
                        _logger.LogWarning("Rate limit exceeded for {ConnectionId}", connectionId);
                        var rlJson = JsonSerializer.Serialize(new { type = "error", code = "rate_limited", message = "Too many messages. Slow down." });
                        await SafeSendAsync(socket, rlJson, ct);
                        continue;
                    }
                    _sendTimestamps.Enqueue(now);

                    var message = await _messageService.SendMessage(messageSendDto);

                    var messageJson = JsonSerializer.Serialize(new
                    {
                        type = "receive",
                        chatId,
                        clientMessageId,
                        payload = message
                    }, _jsonOptions);

                    await BroadcastToGroupAsync(chatId, messageJson, ct);
                    continue;
                }

                if (type == "ping")
                {
                    var pongJson = JsonSerializer.Serialize(new { type = "pong" });
                    await SafeSendAsync(socket, pongJson, ct);
                    continue;
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WebSocket loop for {ConnectionId}", connectionId);
        }
        finally
        {
            await _connections.RemoveSocketAsync(connectionId);
        }
    }

    private async Task BroadcastToGroupAsync(int chatId, string messageJson, CancellationToken ct)
    {
        var bytes = Encoding.UTF8.GetBytes(messageJson);
        var tasks = _connections.GetGroupSockets(chatId).Select(async socket =>
        {
            try
            {
                if (socket.State == WebSocketState.Open)
                    await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
            }
            catch
            {
                // Ignore individual socket send errors; stale sockets are cleaned up on removal.
            }
        });
        await Task.WhenAll(tasks);
    }

    private static async Task SafeSendAsync(WebSocket socket, string messageJson, CancellationToken ct)
    {
        try
        {
            if (socket.State == WebSocketState.Open)
            {
                var bytes = Encoding.UTF8.GetBytes(messageJson);
                await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
            }
        }
        catch { }
    }
}