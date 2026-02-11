using System;
using System.Linq;
using System.Threading.Tasks;
using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Repositories.Classes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CoreService.IntegrationTests.Fixtures
{
    public class CoreServiceDbFixture : IAsyncLifetime, IDisposable
    {
        private ServiceProvider _provider = default!;
        private IServiceScope _scope = default!;
        private string _dbName = string.Empty;
        private string _connectionString = string.Empty;

        public AppDbContext DbContext => _scope.ServiceProvider.GetRequiredService<AppDbContext>();
        public UserManager<User> UserManager => _scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        public IPasswordHasher<User> PasswordHasher => _scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        public UserRepository Repository => new UserRepository(DbContext, UserManager, PasswordHasher);
        public RoleManager<IdentityRole> RoleManager => _scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        public async Task InitializeAsync()
        {
            _dbName = $"ChatLab_CoreServiceTests_{Guid.NewGuid():N}";
            var baseConn = Environment.GetEnvironmentVariable("TEST_SQLSERVER_CONNSTR");
            if (string.IsNullOrWhiteSpace(baseConn))
            {
                baseConn = "Server=(localdb)\\MSSQLLocalDB;Trusted_Connection=True;MultipleActiveResultSets=True";
            }
            _connectionString = baseConn.Contains("Database=", StringComparison.OrdinalIgnoreCase)
                ? baseConn
                : baseConn + $";Database={_dbName}";

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(_connectionString));
            services
                .AddIdentityCore<User>(options =>
                {
                    options.Password.RequireDigit = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireNonAlphanumeric = false;
                    options.Password.RequireUppercase = false;
                    options.Password.RequiredLength = 6;
                })
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            _provider = services.BuildServiceProvider(validateScopes: true);
            _scope = _provider.CreateScope();

            // Ensure DB
            await DbContext.Database.EnsureDeletedAsync();
            await DbContext.Database.EnsureCreatedAsync();

            // Seed roles and users
            await SeedAsync();
        }

        private async Task SeedAsync()
        {
            var roleManager = _scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            foreach (var role in new[] { "Admin", "User" })
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            async Task<User> CreateUserAsync(string email, string first, string last, string role, DateTime created)
            {
                var user = new User
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = email,
                    NormalizedUserName = email.ToUpperInvariant(),
                    Email = email,
                    NormalizedEmail = email.ToUpperInvariant(),
                    EmailConfirmed = true,
                    FirstName = first,
                    LastName = last,
                    PhoneNumber = "+48123456789",
                    Location = "PL",
                    CreationDate = created
                };
                var result = await UserManager.CreateAsync(user, "Passw0rd!");
                if (!result.Succeeded) throw new InvalidOperationException(string.Join(";", result.Errors.Select(e => e.Description)));
                await UserManager.AddToRoleAsync(user, role);
                return user;
            }

            var baseDate = new DateTime(2024, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            // required by repository DeleteUser
            await CreateUserAsync("unknown@unknown.com", "Unknown", "User", "User", baseDate.AddDays(0));

            var userA = await CreateUserAsync("userA@test.com", "Ala", "Nowak", "User", baseDate.AddDays(1));
            var userB = await CreateUserAsync("userB@test.com", "Bartek", "Kowalski", "User", baseDate.AddDays(2));
            var admin1 = await CreateUserAsync("admin1@test.com", "Admin", "One", "Admin", baseDate.AddDays(3));

            // Seed chat and messages for GetUserChats ordering
            var chat = new Chat { User1Id = userA.Id, User2Id = userB.Id };
            await DbContext.Chats.AddAsync(chat);
            await DbContext.SaveChangesAsync();

            CommunicationTechnology tech;
            if (!DbContext.CommunicationTechnologies.Any())
            {
                tech = new CommunicationTechnology { Name = "gRPC" };
                await DbContext.CommunicationTechnologies.AddAsync(tech);
                await DbContext.SaveChangesAsync(); // ensure identity Id is generated
            }
            else
            {
                tech = await DbContext.CommunicationTechnologies.FirstAsync();
            }

            await DbContext.Messages.AddRangeAsync(new[]
            {
                new Message { ChatId = chat.Id, Content = "Hi", SenderId = userA.Id, ReceiverId = userB.Id, CommunicationTechnologyId = tech.Id, Timestamp = baseDate.AddDays(4) },
                new Message { ChatId = chat.Id, Content = "Hello", SenderId = userB.Id, ReceiverId = userA.Id, CommunicationTechnologyId = tech.Id, Timestamp = baseDate.AddDays(5) }
            });
            await DbContext.SaveChangesAsync();
        }

        public async Task DisposeAsync()
        {
            try { await DbContext.Database.EnsureDeletedAsync(); } catch { }
            _scope.Dispose();
            if (_provider is IDisposable d) d.Dispose();
        }

        public void Dispose()
        {
            DisposeAsync().GetAwaiter().GetResult();
        }
    }

    [CollectionDefinition("CoreServiceDb")]
    public class CoreServiceDbCollection : ICollectionFixture<CoreServiceDbFixture> { }
}
