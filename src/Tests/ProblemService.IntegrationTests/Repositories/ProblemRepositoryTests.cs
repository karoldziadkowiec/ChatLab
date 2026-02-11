using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ChatLab.ProblemService.Entities;
using ProblemService.IntegrationTests.Fixtures;
using Xunit;

namespace ProblemService.IntegrationTests.Repositories
{
    [Collection("ProblemServiceDb")]
    public class ProblemRepositoryTests
    {
        private readonly ProblemServiceDbFixture _fixture;

        public ProblemRepositoryTests(ProblemServiceDbFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetProblem_ReturnsSingleById()
        {
            // Arrange
            var all = (await _fixture.Repository.GetAllProblems()).ToList();
            var target = all.First();

            // Act
            var fetched = await _fixture.Repository.GetProblem(target.Id);

            // Assert
            Assert.NotNull(fetched);
            Assert.Equal(target.Id, fetched!.Id);
            Assert.Equal(target.Title, fetched.Title);
        }

        [Fact]
        public async Task GetAllProblems_ReturnsDescendingByCreationDate()
        {
            // Arrange & Act
            var all = (await _fixture.Repository.GetAllProblems()).ToList();

            // Assert
            var ordered = all.OrderByDescending(p => p.CreationDate).ToList();
            Assert.Equal(ordered.Select(p => p.Id), all.Select(p => p.Id));
            Assert.True(all.Count >= 5);
        }

        [Fact]
        public async Task GetSolvedProblems_OnlySolved()
        {
            // Arrange & Act
            var solved = (await _fixture.Repository.GetSolvedProblems()).ToList();

            // Assert
            Assert.NotEmpty(solved);
            Assert.All(solved, p => Assert.True(p.IsSolved));
        }

        [Fact]
        public async Task GetSolvedProblemCount_MatchesSolvedList()
        {
            // Arrange & Act
            var solvedCount = await _fixture.Repository.GetSolvedProblemCount();

            // Assert
            var solved = (await _fixture.Repository.GetSolvedProblems()).Count();
            Assert.Equal(solved, solvedCount);
        }

        [Fact]
        public async Task GetUnsolvedProblems_OnlyUnsolved()
        {
            // Arrange & Act
            var unsolved = (await _fixture.Repository.GetUnsolvedProblems()).ToList();

            // Assert
            Assert.NotEmpty(unsolved);
            Assert.All(unsolved, p => Assert.False(p.IsSolved));
        }

        [Fact]
        public async Task GetUnsolvedProblemCount_MatchesUnsolvedList()
        {
            // Arrange & Act
            var unsolvedCount = await _fixture.Repository.GetUnsolvedProblemCount();

            // Assert
            var unsolved = (await _fixture.Repository.GetUnsolvedProblems()).Count();
            Assert.Equal(unsolved, unsolvedCount);
        }

        [Fact]
        public async Task CreateProblem_SetsDefaultsAndPersists()
        {
            // Arrange
            var problem = new Problem
            {
                Title = "New Problem",
                Description = "New description"
            };

            // Act
            await _fixture.Repository.CreateProblem(problem);

            // Assert
            var fetched = (await _fixture.Repository.GetAllProblems()).FirstOrDefault(p => p.Title == "New Problem");
            Assert.NotNull(fetched);
            Assert.False(fetched!.IsSolved);
            Assert.NotEqual(default, fetched!.CreationDate);
        }

        [Fact]
        public async Task CheckProblemSolved_UpdatesFlag()
        {
            // Arrange
            var unsolved = (await _fixture.Repository.GetUnsolvedProblems()).First();

            // Act
            await _fixture.Repository.CheckProblemSolved(unsolved);

            // Assert
            var refreshed = await _fixture.Repository.GetProblem(unsolved.Id);
            Assert.True(refreshed!.IsSolved);
        }

        [Fact]
        public async Task ExportProblemsToCsv_ReturnsHeaderAndRows()
        {
            // Arrange & Act
            using var stream = await _fixture.Repository.ExportProblemsToCsv();

            // Assert
            using var reader = new StreamReader(stream, Encoding.UTF8, true, 1024, leaveOpen: false);
            var text = await reader.ReadToEndAsync();
            Assert.StartsWith("Problem Id,Is Solved,Title,Description,Creation Date", text.TrimStart());
            // Expect at least the seeded rows
            var lines = text.Split(new[] {"\r\n", "\n"}, StringSplitOptions.RemoveEmptyEntries);
            Assert.True(lines.Length >= 6); // header + >=5 rows
        }
    }
}
