using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.Constants;
using Microsoft.AspNetCore.Identity;

namespace ChatLab.CoreService.DbManager
{
    public static class AppSeeder
    {
        public static async Task Seed(IServiceProvider services)
        {
            using (var dbContext = services.GetRequiredService<AppDbContext>())
            {
                await SeedRoles(services);
                await SeedAdminRole(services);
                await SeedUnknownUser(services);
            }
        }

        private static async Task SeedRoles(IServiceProvider services)
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var roles = new List<string> { Role.Admin, Role.User };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        private static async Task SeedAdminRole(IServiceProvider services)
        {
            string adminEmail = "admin@admin.com";
            string adminPassword = "Admin1!";
            string adminFirstName = "Admin";
            string adminLastName = "Admin";
            string adminPhoneNumber = "000000000";
            string adminLocation = "Admin";
            DateTime adminCreationDate = DateTime.Now;

            var context = services.GetRequiredService<AppDbContext>();
            var userManager = services.GetRequiredService<UserManager<User>>();
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin == null)
            {
                admin = new User
                {
                    Email = adminEmail,
                    UserName = adminEmail,
                    FirstName = adminFirstName,
                    LastName = adminLastName,
                    PhoneNumber = adminPhoneNumber,
                    Location = adminLocation,
                    CreationDate = adminCreationDate,
                };
                await userManager.CreateAsync(admin, adminPassword);
                await userManager.AddToRoleAsync(admin, Role.Admin);
            }
        }

        private static async Task SeedUnknownUser(IServiceProvider services)
        {
            string unknownUserEmail = "unknown@unknown.com";
            string unknownUserPassword = "Unknown1!";
            string unknownUserFirstName = "Unknown";
            string unknownUserLastName = "Unknown";
            string unknownUserPhoneNumber = "000000000";
            string unknownUserLocation = "Unknown";
            DateTime unknownUserCreationDate = DateTime.Now;

            var context = services.GetRequiredService<AppDbContext>();
            var userManager = services.GetRequiredService<UserManager<User>>();
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

            var unknownUser = await userManager.FindByEmailAsync(unknownUserEmail);
            if (unknownUser == null)
            {
                unknownUser = new User
                {
                    Email = unknownUserEmail,
                    UserName = unknownUserEmail,
                    FirstName = unknownUserFirstName,
                    LastName = unknownUserLastName,
                    PhoneNumber = unknownUserPhoneNumber,
                    Location = unknownUserLocation,
                    CreationDate = unknownUserCreationDate,
                };
                await userManager.CreateAsync(unknownUser, unknownUserPassword);
                await userManager.AddToRoleAsync(unknownUser, Role.User);
            }
        }
    }
}