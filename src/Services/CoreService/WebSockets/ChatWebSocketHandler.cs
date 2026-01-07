using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;

public class ChatWebSocketHandler
{
    private readonly WebSocketConnectionManager _connections;
    private readonly IMessageService _messageService;
    private readonly ILogger<ChatWebSocketHandler> _logger;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ChatWebSocketHandler(WebSocketConnectionManager connections, IMessageService messageService, ILogger<ChatWebSocketHandler> logger)
    {
        _connections = connections;
        _messageService = messageService;
        _logger = logger;
    }

    public async Task HandleAsync(WebSocket socket, string connectionId, CancellationToken ct)
    {
        _connections.AddSocket(connectionId, socket);

        var buffer = new byte[4 * 1024];

        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.CloseStatus.HasValue) break;

                var received = Encoding.UTF8.GetString(buffer, 0, result.Count);
                if (string.IsNullOrWhiteSpace(received)) continue;

                JsonDocument doc;
                try { doc = JsonDocument.Parse(received); }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Niepoprawny JSON od {ConnectionId}", connectionId);
                    continue;
                }

                if (!doc.RootElement.TryGetProperty("type", out var typeEl)) continue;
                var type = typeEl.GetString();

                if (type == "join" && doc.RootElement.TryGetProperty("chatId", out var chatIdEl))
                {
                    var chatId = chatIdEl.GetInt32();
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

                    // Deserializuj payload do MessageSendDTO (dopasuj do swojej klasy)
                    MessageSendDTO messageSendDto;
                    try
                    {
                        messageSendDto = JsonSerializer.Deserialize<MessageSendDTO>(payloadEl.GetRawText(), _jsonOptions)!;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Błąd deserializacji payload od {ConnectionId}", connectionId);
                        continue;
                    }

                    // Zapisz wiadomość przez serwis i odbierz gotowy DTO wiadomości
                    var message = await _messageService.SendMessage(messageSendDto);

                    // Serializuj wiadomość i rozgłoś do grupy
                    var messageJson = JsonSerializer.Serialize(new
                    {
                        type = "receive",
                        chatId,
                        payload = message
                    }, _jsonOptions);

                    await BroadcastToGroupAsync(chatId, messageJson, ct);
                    continue;
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd w pętli WebSocket dla {ConnectionId}", connectionId);
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
                // ignoruj problemy z pojedynczym socketem; czyszczenie nastąpi przy RemoveSocketAsync
            }
        });
        await Task.WhenAll(tasks);
    }
}