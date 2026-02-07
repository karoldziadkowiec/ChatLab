using AutoMapper;
using ChatLab.ProblemService.Entities;
using ChatLab.ProblemService.Models.DTOs;
using ChatLab.ProblemService.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatLab.ProblemService.Controllers
{
    [Route("api/problems")]
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

        // GET: api/problems/:problemId
        [HttpGet("{problemId}")]
        public async Task<ActionResult<ProblemDTO>> GetProblem(int problemId)
        {
            var problem = await _problemRepository.GetProblem(problemId);
            if (problem == null)
                return NotFound();

            var problemDto = _mapper.Map<ProblemDTO>(problem);
            return Ok(problemDto);
        }

        // GET: api/problems
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetAllProblems()
        {
            var problems = await _problemRepository.GetAllProblems();
            var problemDtos = _mapper.Map<IEnumerable<ProblemDTO>>(problems);
            return Ok(problemDtos);
        }

        // GET: api/problems/solved
        [HttpGet("solved")]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetSolvedProblems()
        {
            var solvedProblems = await _problemRepository.GetSolvedProblems();
            var solvedProblemsDtos = _mapper.Map<IEnumerable<ProblemDTO>>(solvedProblems);
            return Ok(solvedProblemsDtos);
        }

        // GET: api/problems/solved/count
        [HttpGet("solved/count")]
        public async Task<IActionResult> GetSolvedProblemCount()
        {
            int count = await _problemRepository.GetSolvedProblemCount();
            return Ok(count);
        }

        // GET: api/problems/unsolved
        [HttpGet("unsolved")]
        public async Task<ActionResult<IEnumerable<ProblemDTO>>> GetUnsolvedProblems()
        {
            var unsolvedProblems = await _problemRepository.GetUnsolvedProblems();
            var unsolvedProblemsDtos = _mapper.Map<IEnumerable<ProblemDTO>>(unsolvedProblems);
            return Ok(unsolvedProblemsDtos);
        }

        // GET: api/problems/unsolved/count
        [HttpGet("unsolved/count")]
        public async Task<IActionResult> GetUnsolvedProblemCount()
        {
            int count = await _problemRepository.GetUnsolvedProblemCount();
            return Ok(count);
        }

        // POST: api/problems
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

        // PUT: api/problems/:problemId
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

        // GET: api/problems/export
        [HttpGet("export")]
        public async Task<IActionResult> ExportProblemsToCsv()
        {
            var csvStream = await _problemRepository.ExportProblemsToCsv();
            return File(csvStream, "text/csv", "problems.csv");
        }
    }
}