using Microsoft.AspNetCore.Mvc;

namespace ChatLab.RtHubService.Controllers;

[ApiController]
[Route("api/rt")]
public class RtController : ControllerBase
{
    private readonly RealTimeHub _hub;
    public RtController(RealTimeHub hub)
    {
        _hub = hub;
    }

    [HttpGet("transports")]
    public IActionResult ListTransports()
    {
        // For demo: list registered transport names
        var names = new[] { "signalr", "websocket", "sse" };
        return Ok(names);
    }

    [HttpGet("{transport}/health")]
    public IActionResult TransportHealth(string transport)
    {
        var adapter = _hub.GetByName(transport);
        if (adapter == null)
        {
            return NotFound(new { error = $"Unknown transport '{transport}'" });
        }
        return Ok(adapter.PingAsync().Result);
    }
}
