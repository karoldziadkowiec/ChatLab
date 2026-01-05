using ChatLab.CoreService.SSE;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [ApiController]
    [Route("api/chat")]
    public class ChatSseController : ControllerBase
    {
        private readonly IChatSseService _sseService;

        public ChatSseController(IChatSseService sseService)
        {
            _sseService = sseService;
        }

        [HttpGet("stream")]
        public async Task GetStream([FromQuery] string chatId)
        {
            Response.Headers.Add("Content-Type", "text/event-stream");
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("X-Accel-Buffering", "no");

            var writer = new StreamWriter(Response.Body);
            _sseService.AddClient(chatId, writer);

            await writer.WriteLineAsync("event: connected");
            await writer.WriteLineAsync($"data: Connected to chat {chatId}");
            await writer.WriteLineAsync();
            await writer.FlushAsync();

            try
            {
                // SSE utrzymuje połączenie tak długo, jak klient jest podłączony
                while (!HttpContext.RequestAborted.IsCancellationRequested)
                {
                    await Task.Delay(1000);
                }
            }
            finally
            {
                _sseService.RemoveClient(chatId, writer);
            }
        }
    }
}