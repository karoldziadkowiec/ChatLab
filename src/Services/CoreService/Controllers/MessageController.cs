using AutoMapper;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/messages")]
    [Authorize(Policy = "AdminOrUserRights")]
    [ApiController]
    public class MessageController : ControllerBase
    {
        private readonly IMessageService _messageService;
        private readonly IMapper _mapper;

        public MessageController(IMessageService messageService, IMapper mapper)
        {
            _messageService = messageService;
            _mapper = mapper;
        }

        // GET: api/messages/:messageId
        [HttpGet("{messageId}")]
        public async Task<IActionResult> GetMessageById(int messageId)
        {
            var message = await _messageService.GetMessageById(messageId);
            if (message == null)
                return NotFound($"Message with ID {messageId} not found.");

            return Ok(message);
        }

        // GET: api/messages
        [HttpGet]
        public async Task<IActionResult> GetAllMessages()
        {
            var messages = await _messageService.GetAllMessages();
            return Ok(messages);
        }

        // GET: api/messages/count
        [HttpGet("count")]
        public async Task<IActionResult> GetAllMessagesCount()
        {
            int count = await _messageService.GetAllMessagesCount();
            return Ok(count);
        }

        // GET: api/messages/chat/:chatId
        [HttpGet("chat/{chatId}")]
        public async Task<IActionResult> GetMessagesForChat(int chatId)
        {
            var messages = await _messageService.GetMessagesForChat(chatId);
            return Ok(messages);
        }

        // GET: api/messages/chat/:chatId/count
        [HttpGet("chat/{chatId}/count")]
        public async Task<IActionResult> GetMessagesForChatCount(int chatId)
        {
            int count = await _messageService.GetMessagesForChatCount(chatId);
            return Ok(count);
        }

        // GET: api/messages/chat/:chatId/last-message-date
        [HttpGet("chat/{chatId}/last-message-date")]
        public async Task<IActionResult> GetLastMessageDateForChat(int chatId)
        {
            var lastMessageDate = await _messageService.GetLastMessageDateForChat(chatId);
            return Ok(lastMessageDate);
        }

        // POST: api/messages
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] MessageSendDTO dto)
        {
            await _messageService.SendMessage(dto);
            return Ok(dto);
        }

        // DELETE: api/messages/:messageId
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            try
            {
                await _messageService.DeleteMessage(messageId);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}