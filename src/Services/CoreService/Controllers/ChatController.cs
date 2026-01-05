using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/chats")]
    [Authorize(Policy = "AdminOrUserRights")]
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

        // GET: api/chats/:chatId
        [HttpGet("{chatId}")]
        public async Task<IActionResult> GetChatById(int chatId)
        {
            var chat = await _chatService.GetChatById(chatId);
            if (chat == null)
                return NotFound($"Chat with ID {chatId} not found.");

            return Ok(chat);
        }

        // GET: api/chats
        [HttpGet]
        public async Task<IActionResult> GetChats()
        {
            var chats = await _chatService.GetChats();
            return Ok(chats);
        }

        // GET: api/chats/count
        [HttpGet("count")]
        public async Task<IActionResult> GetChatCount()
        {
            int count = await _chatService.GetChatCount();
            return Ok(count);
        }

        // GET: api/chats/between/:user1Id/:user2Id
        [HttpGet("between/{user1Id}/{user2Id}")]
        public async Task<IActionResult> GetChatIdBetweenUsers(string user1Id, string user2Id)
        {
            var chatId = await _chatService.GetChatIdBetweenUsers(user1Id, user2Id);
            return Ok(chatId);
        }

        // POST: api/chats
        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] ChatCreateDTO dto)
        {
            var chat = _mapper.Map<Chat>(dto);
            await _chatService.CreateChat(chat);
            return CreatedAtAction(nameof(GetChatById), new { chatId = chat.Id }, chat);
        }

        // DELETE: api/chats/:chatId
        [HttpDelete("{chatId}")]
        public async Task<IActionResult> DeleteChat(int chatId)
        {
            var chat = await _chatService.GetChatById(chatId);
            if (chat == null)
                return NotFound($"Chat with ID {chatId} not found.");

            await _chatService.DeleteChat(chatId);
            return NoContent();
        }

        // GET: api/chats/export
        [HttpGet("export")]
        public async Task<IActionResult> ExportChatsToCsv()
        {
            var csvStream = await _chatService.ExportChatsToCsv();
            return File(csvStream, "text/csv", "chats.csv");
        }
    }
}