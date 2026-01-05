using ChatLab.CoreService.Entities;

namespace ChatLab.CoreService.Repositories.Interfaces
{
    public interface IProblemRepository
    {
        Task<Problem> GetProblem(int playerAdvertisementId);
        Task<IEnumerable<Problem>> GetAllProblems();
        Task<IEnumerable<Problem>> GetSolvedProblems();
        Task<int> GetSolvedProblemCount();
        Task<IEnumerable<Problem>> GetUnsolvedProblems();
        Task<int> GetUnsolvedProblemCount();
        Task CreateProblem(Problem problem);
        Task CheckProblemSolved(Problem problem);
        Task<MemoryStream> ExportProblemsToCsv();
    }
}