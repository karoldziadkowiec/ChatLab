using ChatLab.CoreService.RealTime.SSE.Interfaces;
using ChatLab.CoreService.RealTime.Authorization;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
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
        private readonly IChatService _chatService;

        public ChatSseController(IChatSseService sseService, IChatService chatService)
        {
            _sseService = sseService;
            _chatService = chatService;
        }

        [Authorize]
        [HttpGet("stream")]
        public async Task GetStream([FromQuery] string chatId)
        {
            if (!int.TryParse(chatId, out var numericChatId))
            {
                Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            try
            {
                await ChatRoomAuthorizationHelper.RequireChatMemberAsync(_chatService, numericChatId, ChatRoomAuthorizationHelper.GetCurrentUserId(User));
            }
            catch (ArgumentException)
            {
                Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
            catch (UnauthorizedAccessException)
            {
                Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

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
            _sseService.AddClient(numericChatId.ToString(), writer);

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
                _sseService.RemoveClient(numericChatId.ToString(), writer);
            }
        }
    }
}