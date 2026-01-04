using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Net.Http.Json;

namespace ChatLab.CoreService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RtController : ControllerBase
{
    private readonly HttpClient _http;
    public RtController(IHttpClientFactory httpClientFactory)
    {
        _http = httpClientFactory.CreateClient();
    }

    [HttpGet("signalr-health")]
    public async Task<IActionResult> SignalRHealth()
    {
        try
        {
            var data = await _http.GetFromJsonAsync<object>("http://localhost:8011/api/health");
            return Ok(new { via = "core->signalr", result = data });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = ex.Message });
        }
    }
}
