using Microsoft.AspNetCore.Mvc;

namespace ChatLab.WebSocketService.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Health() => Ok(new { status = "ok", service = "websocket" });

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { pong = true });
}
