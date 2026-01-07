using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/communication-technologies")]
    [ApiController]
    public class CommunicationTechnologyController : ControllerBase
    {
        private readonly ICommunicationTechnologyRepository _communicationTechnologyRepository;
        private readonly IMapper _mapper;

        public CommunicationTechnologyController(ICommunicationTechnologyRepository communicationTechnologyRepository, IMapper mapper)
        {
            _communicationTechnologyRepository = communicationTechnologyRepository;
            _mapper = mapper;
        }

        // GET: api/communication-technologies
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CommunicationTechnologyDTO>>> GetCommunicationTechnologies()
        {
            var communicationTechnologies = await _communicationTechnologyRepository.GetCommunicationTechnologies();
            var communicationTechnologyDtos = _mapper.Map<IEnumerable<CommunicationTechnologyDTO>>(communicationTechnologies);
            return Ok(communicationTechnologyDtos);
        }

        // GET: api/communication-technologies/count
        [Authorize(Policy = "AdminRights")]
        [HttpGet("count")]
        public async Task<IActionResult> GetCommunicationTechnologyCount()
        {
            int count = await _communicationTechnologyRepository.GetCommunicationTechnologyCount();
            return Ok(count);
        }

        // GET: api/communication-technologies/id/:name
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("id/{name}")]
        public async Task<IActionResult> GetCommunicationTechnologyId(string name)
        {
            var techId = await _communicationTechnologyRepository.GetCommunicationTechnologyId(name);
            return Ok(techId);
        }

        // GET: api/communication-technologies/name/:technologyId
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("name/{technologyId}")]
        public async Task<IActionResult> GetCommunicationTechnologyName(int technologyId)
        {
            var techName = await _communicationTechnologyRepository.GetCommunicationTechnologyName(technologyId);
            if (techName == null)
                return NotFound();

            return Ok(techName);
        }

        // GET: api/communication-technologies/check/name/:name
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpGet("check/name/{name}")]
        public async Task<IActionResult> CheckCommunicationTechnologyExists(string name)
        {
            var isExists = await _communicationTechnologyRepository.CheckCommunicationTechnologyExists(name);
            return Ok(isExists);
        }

        // POST: api/communication-technologies
        [Authorize(Policy = "AdminRights")]
        [HttpPost]
        public async Task<ActionResult> CreateCommunicationTechnology([FromBody] CommunicationTechnologyDTO communicationTechnologyDTO)
        {
            if (communicationTechnologyDTO == null)
                return BadRequest("Invalid communication technology data.");

            var technology = _mapper.Map<CommunicationTechnology>(communicationTechnologyDTO);
            await _communicationTechnologyRepository.CreateCommunicationTechnology(technology);

            return Ok(communicationTechnologyDTO);
        }
    }
}