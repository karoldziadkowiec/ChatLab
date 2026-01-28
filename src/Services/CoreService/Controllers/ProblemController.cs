using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers
{
    [Route("api/core/problems")]
    [ApiController]
    public class ProblemController : ControllerBase
    {
        private readonly IProblemRepository _problemRepository;
        private readonly IMapper _mapper;

        public ProblemController(IProblemRepository problemRepository, IMapper mapper)
        {
            _problemRepository = problemRepository;
            _mapper = mapper;
        }

        // GET: api/core/problems/:problemId
        [Authorize(Policy = "AdminRights")]
        [HttpGet("{problemId}")]
        public async Task<ActionResult<ProblemDTO>> GetProblem(int problemId)
        {
            var problem = await _problemRepository.GetProblem(problemId);
            if (problem == null)
                return NotFound();

            var problemDto = _mapper.Map<ProblemDTO>(problem);
            return Ok(problemDto);
        }

        // GET: api/core/problems
        [Authorize(Policy = "AdminRights")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetAllProblems()
        {
            var problems = await _problemRepository.GetAllProblems();
            var problemDtos = _mapper.Map<IEnumerable<ProblemDTO>>(problems);
            return Ok(problemDtos);
        }

        // GET: api/core/problems/solved
        [Authorize(Policy = "AdminRights")]
        [HttpGet("solved")]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetSolvedProblems()
        {
            var solvedProblems = await _problemRepository.GetSolvedProblems();
            var solvedProblemsDtos = _mapper.Map<IEnumerable<ProblemDTO>>(solvedProblems);
            return Ok(solvedProblemsDtos);
        }

        // GET: api/core/problems/solved/count
        [Authorize(Policy = "AdminRights")]
        [HttpGet("solved/count")]
        public async Task<IActionResult> GetSolvedProblemCount()
        {
            int count = await _problemRepository.GetSolvedProblemCount();
            return Ok(count);
        }

        // GET: api/core/problems/unsolved
        [Authorize(Policy = "AdminRights")]
        [HttpGet("unsolved")]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetUnsolvedProblems()
        {
            var unsolvedProblems = await _problemRepository.GetUnsolvedProblems();
            var unsolvedProblemsDtos = _mapper.Map<IEnumerable<ProblemDTO>>(unsolvedProblems);
            return Ok(unsolvedProblemsDtos);
        }

        // GET: api/core/problems/unsolved/count
        [Authorize(Policy = "AdminRights")]
        [HttpGet("unsolved/count")]
        public async Task<IActionResult> GetUnsolvedProblemCount()
        {
            int count = await _problemRepository.GetUnsolvedProblemCount();
            return Ok(count);
        }

        // POST: api/core/problems
        [Authorize(Policy = "AdminOrUserRights")]
        [HttpPost]
        public async Task<ActionResult> CreateProblem([FromBody] ProblemCreateDTO dto)
        {
            if (dto == null)
                return BadRequest("Invalid dto data.");

            var problem = _mapper.Map<Problem>(dto);
            await _problemRepository.CreateProblem(problem);

            var createdDto = _mapper.Map<ProblemDTO>(problem);
            return Ok(createdDto);
        }

        // PUT: api/core/problems/:problemId
        [Authorize(Policy = "AdminRights")]
        [HttpPut("{problemId}")]
        public async Task<IActionResult> CheckProblemSolved(int problemId, [FromBody] ProblemDTO dto)
        {
            if (problemId != dto.Id)
                return BadRequest();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var entity = _mapper.Map<Problem>(dto);
            await _problemRepository.CheckProblemSolved(entity);
            return NoContent();
        }

        // GET: api/core/problems/export
        [Authorize(Policy = "AdminRights")]
        [HttpGet("export")]
        public async Task<IActionResult> ExportProblemsToCsv()
        {
            var csvStream = await _problemRepository.ExportProblemsToCsv();
            return File(csvStream, "text/csv", "problems.csv");
        }
    }
}