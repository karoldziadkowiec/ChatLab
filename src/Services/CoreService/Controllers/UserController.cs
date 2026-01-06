using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/users")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public UserController(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        // GET: api/users/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUser(string userId)
        {
            var user = await _userRepository.GetUser(userId);
            if (user == null)
                return NotFound();

            var userDTO = _mapper.Map<UserDTO>(user);
            return Ok(userDTO);
        }

        // GET: api/users
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userRepository.GetUsers();
            var userDTOs = _mapper.Map<IEnumerable<UserDTO>>(users);
            return Ok(userDTOs);
        }

        // GET: api/users/role/user
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("role/user")]
        public async Task<IActionResult> GetOnlyUsers()
        {
            var onlyUsers = await _userRepository.GetOnlyUsers();
            var onlyUserDTOs = _mapper.Map<IEnumerable<UserDTO>>(onlyUsers);
            return Ok(onlyUserDTOs);
        }

        // GET: api/users/role/admin
        [Authorize(Policy = "AdminRights")]
        [HttpGet("role/admin")]
        public async Task<IActionResult> GetOnlyAdmins()
        {
            var onlyAdmins = await _userRepository.GetOnlyAdmins();
            var onlyAdminDTOs = _mapper.Map<IEnumerable<UserDTO>>(onlyAdmins);
            return Ok(onlyAdminDTOs);
        }

        // GET: api/users/:userId/role
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("{userId}/role")]
        public async Task<IActionResult> GetUserRole(string userId)
        {
            string role = await _userRepository.GetUserRole(userId);
            return Ok(role);
        }

        // GET: api/users/count
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("count")]
        public async Task<IActionResult> GetUserCount()
        {
            int count = await _userRepository.GetUserCount();
            return Ok(count);
        }

        // PUT: api/users/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateUser(string userId, [FromBody]UserUpdateDTO dto)
        {
            try
            {
                var user = await _userRepository.GetUser(userId);
                if (user == null)
                    return NotFound($"User {userId} not found");

                _mapper.Map(dto, user);
                await _userRepository.UpdateUser(user);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (await _userRepository.GetUser(userId) == null)
                    return NotFound($"User {userId} not found");
                else
                    throw;
            }
            return NoContent();
        }

        // PUT: api/users/reset-password/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPut("reset-password/{userId}")]
        public async Task<IActionResult> ResetUserPassword(string userId, [FromBody] UserResetPasswordDTO dto)
        {
            try
            {
                if (!dto.PasswordHash.Equals(dto.ConfirmPasswordHash))
                    return BadRequest("Confirmed password is different.");

                var user = await _userRepository.GetUser(userId);
                if (user == null)
                    return NotFound($"User {userId} not found");

                await _userRepository.ResetUserPassword(user, dto.PasswordHash);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (await _userRepository.GetUser(userId) == null)
                    return NotFound($"User {userId} not found");
                else
                    throw;
            }
            return NoContent();
        }

        // DELETE: api/users/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpDelete("{userId}")]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            try
            {
                var user = await _userRepository.GetUser(userId);
                if (user == null)
                    return NotFound($"User {userId} not found");

                await _userRepository.DeleteUser(userId);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.InnerException?.Message ?? ex.Message}");
            }
            return NoContent();
        }

        // GET: api/users/:userId/chats
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("{userId}/chats")]
        public async Task<ActionResult<IEnumerable<Chat>>> GetUserChats(string userId)
        {
            var userChats = await _userRepository.GetUserChats(userId);
            var userChatsDtos = _mapper.Map<IEnumerable<ChatDTO>>(userChats);
            return Ok(userChatsDtos);
        }

        // GET: api/users/export
        [Authorize(Policy = "AdminRights")]
        [HttpGet("export")]
        public async Task<IActionResult> ExportUsersToCsv()
        {
            var csvStream = await _userRepository.ExportUsersToCsv();
            return File(csvStream, "text/csv", "users.csv");
        }
    }
}