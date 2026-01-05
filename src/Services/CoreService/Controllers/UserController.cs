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
    [Authorize(Policy = "AdminOrUserRights")]
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
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUser(string userId)
        {
            var userDTO = await _userRepository.GetUser(userId);
            if (userDTO == null)
                return NotFound();

            return Ok(userDTO);
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var userDTOs = await _userRepository.GetUsers();
            return Ok(userDTOs);
        }

        // GET: api/users/role/user
        [HttpGet("role/user")]
        public async Task<IActionResult> GetOnlyUsers()
        {
            var onlyUserDTOs = await _userRepository.GetOnlyUsers();
            return Ok(onlyUserDTOs);
        }

        // GET: api/users/role/admin
        [HttpGet("role/admin")]
        public async Task<IActionResult> GetOnlyAdmins()
        {
            var onlyAdminDTOs = await _userRepository.GetOnlyAdmins();
            return Ok(onlyAdminDTOs);
        }

        // GET: api/users/:userId/role
        [HttpGet("{userId}/role")]
        public async Task<IActionResult> GetUserRole(string userId)
        {
            string role = await _userRepository.GetUserRole(userId);
            return Ok(role);
        }

        // GET: api/users/count
        [HttpGet("count")]
        public async Task<IActionResult> GetUserCount()
        {
            int count = await _userRepository.GetUserCount();
            return Ok(count);
        }

        // PUT: api/users/:userId
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateUser(string userId, [FromBody]UserUpdateDTO dto)
        {
            try
            {
                await _userRepository.UpdateUser(userId, dto);
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
        [HttpPut("reset-password/{userId}")]
        public async Task<IActionResult> ResetUserPassword(string userId, [FromBody] UserResetPasswordDTO dto)
        {
            try
            {
                await _userRepository.ResetUserPassword(userId, dto);
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
        [HttpGet("{userId}/chats")]
        public async Task<ActionResult<IEnumerable<Chat>>> GetUserChats(string userId)
        {
            var userChats = await _userRepository.GetUserChats(userId);
            return Ok(userChats);
        }

        // GET: api/users/export
        [HttpGet("export")]
        public async Task<IActionResult> ExportUsersToCsv()
        {
            var csvStream = await _userRepository.ExportUsersToCsv();
            return File(csvStream, "text/csv", "users.csv");
        }
    }
}