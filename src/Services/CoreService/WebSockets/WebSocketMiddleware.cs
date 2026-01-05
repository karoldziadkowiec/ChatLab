using System.Net.WebSockets;

public class WebSocketMiddleware
{
    private readonly RequestDelegate _next;
    private readonly WebSocketConnectionManager _connectionManager;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WebSocketMiddleware> _logger;

    public WebSocketMiddleware(RequestDelegate next, WebSocketConnectionManager connectionManager, IServiceProvider serviceProvider, ILogger<WebSocketMiddleware> logger)
    {
        _next = next;
        _connectionManager = connectionManager;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            await _next(context);
            return;
        }

        var socket = await context.WebSockets.AcceptWebSocketAsync();
        var connectionId = Guid.NewGuid().ToString();
        _logger.LogInformation("Nowe połączenie WebSocket {ConnectionId}", connectionId);

        // Utwórz scope, z którego rozwiążesz scoped handler i inne scoped serwisy.
        using var scope = _serviceProvider.CreateScope();

        // Rozwiąż handler z scope (handler powinien być zarejestrowany jako Scoped)
        var handler = scope.ServiceProvider.GetRequiredService<ChatWebSocketHandler>();

        // Użyj context.RequestAborted jako tokenu anulowania
        var cancellation = context.RequestAborted;

        try
        {
            // Przekaż socket do handlera; ważne: handler używa serwisów z scope, więc scope
            // musi żyć do momentu zakończenia HandleAsync.
            await handler.HandleAsync(socket, connectionId, cancellation);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd w WebSocket middleware dla {ConnectionId}", connectionId);
        }
        finally
        {
            // jeśli handler nie zamknął socket, zamknij go tutaj bez wyjątku
            try
            {
                if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
            }
            catch { /* ignore */ }
        }
    }
}