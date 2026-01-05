using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/user-followers")]
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

        // GET: api/user-followers/:userFollowId
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

        // GET: api/user-followers
        [Authorize(Policy = "AdminRights")]
        [HttpGet]
        public async Task<IActionResult> GetUserFollowers()
        {
            var userFollowers = await _userFollowRepository.GetUserFollowers();
            var userFollowDtos = _mapper.Map<IEnumerable<UserFollowDTO>>(userFollowers);
            return Ok(userFollowDtos);
        }

        // GET: api/user-followers/count
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("count")]
        public async Task<IActionResult> GetUserFollowCount()
        {
            int count = await _userFollowRepository.GetUserFollowCount();
            return Ok(count);
        }

        // GET: api/user-followers/between/:followerId/:followedId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("between/{followerId}/{followedId}")]
        public async Task<IActionResult> GetUserFollowIdBetweenUsers(string followerId, string followedId)
        {
            var userFollowId = await _userFollowRepository.GetUserFollowIdBetweenUsers(followerId, followedId);
            return Ok(userFollowId);
        }

        // POST: api/user-followers
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPost]
        public async Task<IActionResult> CreateUserFollow([FromBody] UserFollowCreateDTO dto)
        {
            var userFollow = _mapper.Map<UserFollow>(dto);
            await _userFollowRepository.CreateUserFollow(userFollow);
            return CreatedAtAction(nameof(GetUserFollowById), new { userFollowId = userFollow.Id }, userFollow);
        }

        // DELETE: api/user-followers/:userFollowId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpDelete("{userFollowId}")]
        public async Task<IActionResult> RemoveUserFollow(int userFollowId)
        {
            await _userFollowRepository.RemoveUserFollow(userFollowId);
            return NoContent();
        }
    }
}