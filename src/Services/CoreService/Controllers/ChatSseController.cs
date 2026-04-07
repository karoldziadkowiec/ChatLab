using ChatLab.CoreService.RealTime.SSE.Interfaces;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace ChatLab.CoreService.Controllers
{
    [ApiController]
    [Route("api/core/chat")]
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
            // Required for proper SSE streaming (avoid server/proxy buffering)
            HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.Headers["Connection"] = "keep-alive";

            // NOTE: Do NOT enable AutoFlush here. It triggers synchronous flushes which are disallowed by Kestrel
            // (and results in 500). We flush explicitly via FlushAsync.
            var writer = new StreamWriter(Response.Body, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), bufferSize: 1024, leaveOpen: true)
            {
                AutoFlush = false
            };
            _sseService.AddClient(chatId, writer);

            await writer.WriteLineAsync("event: connected");
            await writer.WriteLineAsync($"data: Connected to chat {chatId}");
            await writer.WriteLineAsync();
            await writer.FlushAsync();

            try
            {
                await Response.Body.FlushAsync(HttpContext.RequestAborted);
            }
            catch
            {
                // Ignore flush failures (e.g., client disconnect during handshake)
            }

            try
            {
                // SSE utrzymuje połączenie tak długo, jak klient jest podłączony
                while (!HttpContext.RequestAborted.IsCancellationRequested)
                {
                    // Keep-alive comment (prevents some proxies/timeouts from closing idle streams)
                    await writer.WriteLineAsync(": keep-alive");
                    await writer.WriteLineAsync();
                    await writer.FlushAsync();
                    await Task.Delay(15000, HttpContext.RequestAborted);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal disconnect
            }
            catch (IOException)
            {
                // Client disconnected / stream broken
            }
            finally
            {
                _sseService.RemoveClient(chatId, writer);
            }
        }
    }
}