using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ChatLab.CoreService.Repositories.Classes
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
            return await _dbContext.Problems
                .Include(p => p.Requester)
                .FirstOrDefaultAsync(p => p.Id == problemId);
        }

        public async Task<IEnumerable<Problem>> GetAllProblems()
        {
            return await _dbContext.Problems
                .Include(p => p.Requester)
                .OrderByDescending(p => p.CreationDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Problem>> GetSolvedProblems()
        {
            return await _dbContext.Problems
                .Include(p => p.Requester)
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
                .Include(p => p.Requester)
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
            csv.AppendLine("Problem Id,Is Solved,Requester E-mail,Requester First Name,Requester Last Name,Title,Description,Creation Date");

            foreach (var problem in problems)
            {
                csv.AppendLine($"{problem.Id},{problem.IsSolved},{problem.Requester.Email},{problem.Requester.FirstName},{problem.Requester.LastName},{problem.Title},{problem.Description},{problem.CreationDate:yyyy-MM-dd}");
            }

            var byteArray = Encoding.UTF8.GetBytes(csv.ToString());
            var csvStream = new MemoryStream(byteArray);

            return csvStream;
        }
    }
}