var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddControllers();

// Transport abstraction and registrations
builder.Services.AddSingleton<IRealTimeTransport, SignalRTransport>();
builder.Services.AddSingleton<IRealTimeTransport, WebSocketTransport>();
builder.Services.AddSingleton<IRealTimeTransport, SseTransport>();
builder.Services.AddSingleton<RealTimeHub>();

var app = builder.Build();

app.UseCors();
app.MapControllers();

// Health for hub
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "rt-hub" }));

app.Run();

public interface IRealTimeTransport
{
    string Name { get; }
    Task<object> PingAsync();
}

public class SignalRTransport : IRealTimeTransport
{
    public string Name => "signalr";
    public Task<object> PingAsync() => Task.FromResult<object>(new { transport = Name, ok = true });
}

public class WebSocketTransport : IRealTimeTransport
{
    public string Name => "websocket";
    public Task<object> PingAsync() => Task.FromResult<object>(new { transport = Name, ok = true });
}

public class SseTransport : IRealTimeTransport
{
    public string Name => "sse";
    public Task<object> PingAsync() => Task.FromResult<object>(new { transport = Name, ok = true });
}

public class RealTimeHub
{
    private readonly IEnumerable<IRealTimeTransport> _transports;
    public RealTimeHub(IEnumerable<IRealTimeTransport> transports)
    {
        _transports = transports;
    }

    public IRealTimeTransport? GetByName(string name)
        => _transports.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
}
