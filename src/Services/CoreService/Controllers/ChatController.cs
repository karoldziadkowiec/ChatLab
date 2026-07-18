using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.RealTime.Authorization;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/core/chats")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IMapper _mapper;

        public ChatController(IChatService chatService, IMapper mapper)
        {
            _chatService = chatService;
            _mapper = mapper;
        }

        // GET: api/core/chats/:chatId
        [Authorize]
        [HttpGet("{chatId}")]
        public async Task<IActionResult> GetChatById(int chatId)
        {
            try
            {
                 var chat = await ChatRoomAuthorizationHelper.RequireChatReadAccessAsync(_chatService, chatId, User);
                var chatDto = _mapper.Map<ChatDTO>(chat);
                return Ok(chatDto);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        // GET: api/core/chats
        [Authorize(Policy = "AdminRights")]
        [HttpGet]
        public async Task<IActionResult> GetChats()
        {
            var chats = await _chatService.GetChats();
            var chatDtos = _mapper.Map<IEnumerable<ChatDTO>>(chats);
            return Ok(chatDtos);
        }

        // GET: api/core/chats/count
        [Authorize]
        [HttpGet("count")]
        public async Task<IActionResult> GetChatCount()
        {
            int count = await _chatService.GetChatCount();
            return Ok(count);
        }

        // GET: api/core/chats/between/:user1Id/:user2Id
        [Authorize]
        [HttpGet("between/{user1Id}/{user2Id}")]
        public async Task<IActionResult> GetChatIdBetweenUsers(string user1Id, string user2Id)
        {
            var currentUserId = ChatRoomAuthorizationHelper.GetCurrentUserId(User);
            if (!string.IsNullOrWhiteSpace(currentUserId) && currentUserId != user1Id && currentUserId != user2Id)
                return Forbid();

            var chatId = await _chatService.GetChatIdBetweenUsers(user1Id, user2Id);
            return Ok(chatId);
        }

        // POST: api/core/chats
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] ChatCreateDTO dto)
        {
            var chat = _mapper.Map<Chat>(dto);
            await _chatService.CreateChat(chat);
            return CreatedAtAction(nameof(GetChatById), new { chatId = chat.Id }, chat);
        }

        // DELETE: api/core/chats/:chatId
        [Authorize]
        [HttpDelete("{chatId}")]
        public async Task<IActionResult> DeleteChat(int chatId)
        {
            try
            {
                 await ChatRoomAuthorizationHelper.RequireChatReadAccessAsync(_chatService, chatId, User);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }

            await _chatService.DeleteChat(chatId);
            return NoContent();
        }

        // GET: api/core/chats/export
        [Authorize(Policy = "AdminRights")]
        [HttpGet("export")]
        public async Task<IActionResult> ExportChatsToCsv()
        {
            var csvStream = await _chatService.ExportChatsToCsv();
            return File(csvStream, "text/csv", "chats.csv");
        }
    }
}