using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/core/user-followers")]
    [ApiController]
    public class UserFollowController : ControllerBase
    {
        private readonly IUserFollowRepository _userFollowRepository;
        private readonly IMapper _mapper;

        public UserFollowController(IUserFollowRepository userFollowRepository, IMapper mapper)
        {
            _userFollowRepository = userFollowRepository;
            _mapper = mapper;
        }

        // GET: api/core/user-followers/:userFollowId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("{userFollowId}")]
        public async Task<IActionResult> GetUserFollowById(int userFollowId)
        {
            var userFollow = await _userFollowRepository.GetUserFollowById(userFollowId);
            if (userFollow == null)
                return NotFound($"User follow with ID {userFollowId} not found.");

            var userFollowDto = _mapper.Map<UserFollowDTO>(userFollow);
            return Ok(userFollowDto);
        }

        // GET: api/core/user-followers
        [Authorize(Policy = "AdminRights")]
        [HttpGet]
        public async Task<IActionResult> GetUserFollowers()
        {
            var userFollowers = await _userFollowRepository.GetUserFollowers();
            var userFollowDtos = _mapper.Map<IEnumerable<UserFollowDTO>>(userFollowers);
            return Ok(userFollowDtos);
        }

        // GET: api/core/user-followers/count
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("count")]
        public async Task<IActionResult> GetUserFollowCount()
        {
            int count = await _userFollowRepository.GetUserFollowCount();
            return Ok(count);
        }

        // GET: api/core/user-followers/followed/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("followed/{userId}")]
        public async Task<ActionResult<IEnumerable<UserFollow>>> GetUserFollowedForUser(string userId)
        {
            var userFollowed = await _userFollowRepository.GetUserFollowedForUser(userId);
            var userFollowedDtos = _mapper.Map<IEnumerable<UserFollowDTO>>(userFollowed);
            return Ok(userFollowedDtos);
        }

        // GET: api/core/user-followers/followed/count/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("followed/count/{userId}")]
        public async Task<IActionResult> GetUserFollowedForUserCount(string userId)
        {
            int count = await _userFollowRepository.GetUserFollowedForUserCount(userId);
            return Ok(count);
        }

        // GET: api/core/user-followers/followers/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("followers/{userId}")]
        public async Task<ActionResult<IEnumerable<UserFollow>>> GetUserFollowersForUser(string userId)
        {
            var userFollowers = await _userFollowRepository.GetUserFollowersForUser(userId);
            var userFollowersDtos = _mapper.Map<IEnumerable<UserFollowDTO>>(userFollowers);
            return Ok(userFollowersDtos);
        }

        // GET: api/core/user-followers/followers/count/:userId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("followers/count/{userId}")]
        public async Task<IActionResult> GetUserFollowersForUserCount(string userId)
        {
            int count = await _userFollowRepository.GetUserFollowersForUserCount(userId);
            return Ok(count);
        }

        // GET: api/core/user-followers/between/:followerId/:followedId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("between/{followerId}/{followedId}")]
        public async Task<IActionResult> GetUserFollowIdBetweenUsers(string followerId, string followedId)
        {
            var userFollowId = await _userFollowRepository.GetUserFollowIdBetweenUsers(followerId, followedId);
            return Ok(userFollowId);
        }

        // POST: api/core/user-followers
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPost]
        public async Task<IActionResult> CreateUserFollow([FromBody] UserFollowCreateDTO dto)
        {
            var userFollow = _mapper.Map<UserFollow>(dto);
            await _userFollowRepository.CreateUserFollow(userFollow);
            return CreatedAtAction(nameof(GetUserFollowById), new { userFollowId = userFollow.Id }, userFollow);
        }

        // DELETE: api/core/user-followers/:userFollowId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpDelete("{userFollowId}")]
        public async Task<IActionResult> RemoveUserFollow(int userFollowId)
        {
            await _userFollowRepository.RemoveUserFollow(userFollowId);
            return NoContent();
        }
    }
}