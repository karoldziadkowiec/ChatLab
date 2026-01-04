using Microsoft.AspNetCore.Mvc;

namespace ChatLab.SseService.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Health() => Ok(new { status = "ok", service = "sse" });

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { pong = true });
}
