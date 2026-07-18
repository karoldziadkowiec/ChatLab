using System.Net.WebSockets;
using System.Security.Claims;

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
        _logger.LogInformation("New WebSocket connection {ConnectionId}", connectionId);

        // Create a scope to resolve scoped handler and other scoped services.
        using var scope = _serviceProvider.CreateScope();

        // Resolve handler from scope (handler should be registered as Scoped).
        var handler = scope.ServiceProvider.GetRequiredService<ChatWebSocketHandler>();

        // Use context.RequestAborted as cancellation token.
        var cancellation = context.RequestAborted;

        try
        {
            // Pass the socket to the handler; the handler uses scoped services,
            // so the scope must live until HandleAsync completes.
            await handler.HandleAsync(socket, connectionId, cancellation, context.User);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WebSocket middleware for {ConnectionId}", connectionId);
        }
        finally
        {
            // If the handler didn't close the socket, close it here gracefully.
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