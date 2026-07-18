using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.RealTime.Authorization;
using ChatLab.CoreService.RealTime.SSE.Interfaces;
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
        private readonly IChatService _chatService;
        private readonly IMapper _mapper;
        private readonly IChatSseService _chatSseService;

        public MessageController(IMessageService messageService, IChatService chatService, IMapper mapper, IChatSseService chatSseService)
        {
            _messageService = messageService;
            _chatService = chatService;
            _mapper = mapper;
            _chatSseService = chatSseService;
        }

        // GET: api/core/messages/:messageId
        [Authorize]
        [HttpGet("{messageId}")]
        public async Task<IActionResult> GetMessageById(int messageId)
        {
            var message = await _messageService.GetMessageById(messageId);
            if (message == null)
                return NotFound($"Message with ID {messageId} not found.");

            try
            {
                 await ChatRoomAuthorizationHelper.RequireChatReadAccessAsync(_chatService, message.ChatId, User);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }

            var messageDto = _mapper.Map<MessageDTO>(message);
            return Ok(messageDto);
        }

        // GET: api/core/messages
        [Authorize(Policy = "AdminRights")]
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
        [Authorize]
        [HttpGet("chat/{chatId}")]
        public async Task<IActionResult> GetMessagesForChat(int chatId)
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

            var messages = await _messageService.GetMessagesForChat(chatId);
            var messageDtos = _mapper.Map<IEnumerable<MessageDTO>>(messages);
            return Ok(messageDtos);
        }

        // GET: api/core/messages/chat/:chatId/after/:afterMessageId
        // Optimized for polling: returns only messages with Id > afterMessageId.
        [Authorize]
        [HttpGet("chat/{chatId}/after/{afterMessageId}")]
        public async Task<IActionResult> GetMessagesForChatAfterId(int chatId, int afterMessageId)
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

            var messages = await _messageService.GetMessagesForChatAfterId(chatId, afterMessageId);
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
        [Authorize]
        [HttpGet("chat/{chatId}/last-message-date")]
        public async Task<IActionResult> GetLastMessageDateForChat(int chatId)
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

            var lastMessageDate = await _messageService.GetLastMessageDateForChat(chatId);
            return Ok(lastMessageDate);
        }

        // POST: api/core/messages
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] MessageSendDTO messageDto)
        {
            try
            {
                var chat = await ChatRoomAuthorizationHelper.RequireChatAccessAsync(_chatService, messageDto.ChatId, User);
                ChatRoomAuthorizationHelper.RequireSenderMatchesCurrentUserOrAdmin(User, messageDto.SenderId);
                if (!ChatRoomAuthorizationHelper.CanUseReceiver(chat, messageDto.ReceiverId, User))
                    return Forbid();
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }

            var created = await _messageService.SendMessage(messageDto);
            var createdDto = _mapper.Map<MessageDTO>(created);

            // SSE: push the created message to connected stream clients.
            // (Clients correlate by id for latency/throughput metrics.)
            await _chatSseService.SendMessageAsync(created.ChatId.ToString(), createdDto);

            return Ok(createdDto);
        }

        // DELETE: api/core/messages/:messageId
        [Authorize]
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            try
            {
                var message = await _messageService.GetMessageById(messageId);
                if (message == null)
                    return NotFound($"Message with ID {messageId} not found.");

                    await ChatRoomAuthorizationHelper.RequireChatReadAccessAsync(_chatService, message.ChatId, User);
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