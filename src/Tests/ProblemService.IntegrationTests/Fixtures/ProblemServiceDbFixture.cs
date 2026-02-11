using System;
using System.Threading.Tasks;
using ChatLab.ProblemService.DbManager;
using ChatLab.ProblemService.Entities;
using ChatLab.ProblemService.Repositories.Classes;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ProblemService.IntegrationTests.Fixtures
{
    // Shared fixture to create a real MS SQL database before tests and tear it down after
    public class ProblemServiceDbFixture : IAsyncLifetime, IDisposable
    {
        private string _dbName = string.Empty;
        private string _connectionString = string.Empty;
        public AppDbContext Context { get; private set; } = default!;
        public ProblemRepository Repository { get; private set; } = default!;

        public async Task InitializeAsync()
        {
            _dbName = $"ChatLab_ProblemServiceTests_{Guid.NewGuid():N}";

            // Allow override via env var TEST_SQLSERVER_CONNSTR (must include Server and auth). We append Database when needed.
            var baseConn = Environment.GetEnvironmentVariable("TEST_SQLSERVER_CONNSTR");
            if (string.IsNullOrWhiteSpace(baseConn))
            {
                // Default to LocalDB on Windows
                baseConn = "Server=(localdb)\\MSSQLLocalDB;Trusted_Connection=True;MultipleActiveResultSets=True";
            }
            _connectionString = baseConn.Contains("Database=", StringComparison.OrdinalIgnoreCase)
                ? baseConn
                : baseConn + $";Database={_dbName}";

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(_connectionString)
                .Options;

            Context = new AppDbContext(options);
            await Context.Database.EnsureDeletedAsync();
            await Context.Database.EnsureCreatedAsync();

            await SeedAsync(Context);

            Repository = new ProblemRepository(Context);
        }

        private static async Task SeedAsync(AppDbContext ctx)
        {
            var baseDate = new DateTime(2024, 01, 01, 12, 0, 0, DateTimeKind.Utc);
            var problems = new[]
            {
                new Problem { Title = "Array Sum", Description = "Compute sum of array", CreationDate = baseDate.AddDays(1), IsSolved = true },
                new Problem { Title = "String Reverse", Description = "Reverse a string", CreationDate = baseDate.AddDays(2), IsSolved = false },
                new Problem { Title = "Prime Check", Description = "Check if prime", CreationDate = baseDate.AddDays(3), IsSolved = true },
                new Problem { Title = "Fibonacci", Description = "Generate Fibonacci sequence", CreationDate = baseDate.AddDays(4), IsSolved = false },
                new Problem { Title = "Sorting", Description = "Sort numbers", CreationDate = baseDate.AddDays(5), IsSolved = true },
            };

            await ctx.Problems.AddRangeAsync(problems);
            await ctx.SaveChangesAsync();
        }

        public async Task DisposeAsync()
        {
            try
            {
                await Context.Database.EnsureDeletedAsync();
            }
            catch { }
            Context.Dispose();
        }

        public void Dispose()
        {
            DisposeAsync().GetAwaiter().GetResult();
        }
    }

    [CollectionDefinition("ProblemServiceDb")]
    public class ProblemServiceDbCollection : ICollectionFixture<ProblemServiceDbFixture>
    {
        // This class has no code, and is never created. Its purpose is simply
        // to be the place to apply [CollectionDefinition] and all the
        // ICollectionFixture<> interfaces.
    }
}
