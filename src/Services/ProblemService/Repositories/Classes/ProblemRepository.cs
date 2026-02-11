using ChatLab.ProblemService.DbManager;
using ChatLab.ProblemService.Entities;
using ChatLab.ProblemService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ChatLab.ProblemService.Repositories.Classes
{
    public class ProblemRepository : IProblemRepository
    {
        private readonly AppDbContext _dbContext;

        public ProblemRepository(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Problem> GetProblem(int problemId)
        {
            return await _dbContext.Problems.FirstOrDefaultAsync(p => p.Id == problemId);
        }

        public async Task<IEnumerable<Problem>> GetAllProblems()
        {
            return await _dbContext.Problems
                .OrderByDescending(p => p.CreationDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Problem>> GetSolvedProblems()
        {
            return await _dbContext.Problems
                .Where(p => p.IsSolved == true)
                .OrderByDescending(p => p.CreationDate)
                .ToListAsync();
        }

        public async Task<int> GetSolvedProblemCount()
        {
            return await _dbContext.Problems.Where(p => p.IsSolved == true).CountAsync();
        }

        public async Task<IEnumerable<Problem>> GetUnsolvedProblems()
        {
            return await _dbContext.Problems
                .Where(pa => pa.IsSolved == false)
                .OrderByDescending(p => p.CreationDate)
                .ToListAsync();
        }

        public async Task<int> GetUnsolvedProblemCount()
        {
            return await _dbContext.Problems.Where(p => p.IsSolved == false).CountAsync();
        }

        public async Task CreateProblem(Problem problem)
        {
            problem.CreationDate = DateTime.Now;
            problem.IsSolved = false;

            await _dbContext.Problems.AddAsync(problem);
            await _dbContext.SaveChangesAsync();
        }

        public async Task CheckProblemSolved(Problem problem)
        {
            var entity = await _dbContext.Problems
                .FirstOrDefaultAsync(p => p.Id == problem.Id);

            if (entity == null)
                throw new KeyNotFoundException($"Problem with id {problem.Id} not found.");

            entity.IsSolved = true;
            await _dbContext.SaveChangesAsync();
        }

        public async Task<MemoryStream> ExportProblemsToCsv()
        {
            var problems = await GetAllProblems();
            var csv = new StringBuilder();
            csv.AppendLine("Problem Id,Is Solved,Title,Description,Creation Date");

            foreach (var problem in problems)
            {
                csv.AppendLine($"{problem.Id},{problem.IsSolved},{problem.Title},{problem.Description},{problem.CreationDate:yyyy-MM-dd}");
            }

            var byteArray = Encoding.UTF8.GetBytes(csv.ToString());
            var csvStream = new MemoryStream(byteArray);

            return csvStream;
        }
    }
}