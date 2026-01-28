using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/core/messages")]
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

        // GET: api/core/messages/:messageId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("{messageId}")]
        public async Task<IActionResult> GetMessageById(int messageId)
        {
            var message = await _messageService.GetMessageById(messageId);
            if (message == null)
                return NotFound($"Message with ID {messageId} not found.");

            var messageDto = _mapper.Map<MessageDTO>(message);
            return Ok(messageDto);
        }

        // GET: api/core/messages
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet]
        public async Task<IActionResult> GetAllMessages()
        {
            var messages = await _messageService.GetAllMessages();
            var messageDtos = _mapper.Map<IEnumerable<MessageDTO>>(messages);
            return Ok(messageDtos);
        }

        // GET: api/core/messages/count
        [Authorize(Policy = "AdminRights")]
        [HttpGet("count")]
        public async Task<IActionResult> GetAllMessagesCount()
        {
            int count = await _messageService.GetAllMessagesCount();
            return Ok(count);
        }

        // GET: api/core/messages/chat/:chatId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("chat/{chatId}")]
        public async Task<IActionResult> GetMessagesForChat(int chatId)
        {
            var messages = await _messageService.GetMessagesForChat(chatId);
            var messageDtos = _mapper.Map<IEnumerable<MessageDTO>>(messages);
            return Ok(messageDtos);
        }

        // GET: api/core/messages/chat/:chatId/count
        [Authorize(Policy = "AdminRights")]
        [HttpGet("chat/{chatId}/count")]
        public async Task<IActionResult> GetMessagesForChatCount(int chatId)
        {
            int count = await _messageService.GetMessagesForChatCount(chatId);
            return Ok(count);
        }

        // GET: api/core/messages/chat/:chatId/last-message-date
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("chat/{chatId}/last-message-date")]
        public async Task<IActionResult> GetLastMessageDateForChat(int chatId)
        {
            var lastMessageDate = await _messageService.GetLastMessageDateForChat(chatId);
            return Ok(lastMessageDate);
        }

        // POST: api/core/messages
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] MessageSendDTO messageDto)
        {
            await _messageService.SendMessage(messageDto);
            return Ok(messageDto);
        }

        // DELETE: api/core/messages/:messageId
        [Authorize(Policy = "AdminOrUserRights")]
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