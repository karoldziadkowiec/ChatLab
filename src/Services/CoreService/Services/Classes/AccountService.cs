using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using Microsoft.AspNetCore.Identity;
using System.IdentityModel.Tokens.Jwt;
using ChatLab.CoreService.Services.Interfaces;
using ChatLab.CoreService.Models.DTOs;
using AutoMapper;
using ChatLab.CoreService.Models.Constants;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Services.Classes
{
    public class AccountService : IAccountService
    {
        private readonly AppDbContext _dbContext;
        private readonly UserManager<User> _userManager;
        private readonly IMapper _mapper;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ITokenService _tokenService;
        private readonly ICookieService _cookieService;

        public AccountService(AppDbContext dbContext, UserManager<User> userManager, IMapper mapper, RoleManager<IdentityRole> roleManager, ITokenService tokenService, ICookieService cookieService)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _mapper = mapper;
            _roleManager = roleManager;
            _tokenService = tokenService;
            _cookieService = cookieService;
        }

        public async Task Register(RegisterDTO registerDTO)
        {
            var userByEmail = await _userManager.FindByEmailAsync(registerDTO.Email);
            if (userByEmail != null)
                throw new ArgumentException($"User with email {registerDTO.Email} already exists.");

            if (!registerDTO.Password.Equals(registerDTO.ConfirmPassword))
                throw new ArgumentException($"Confirmed password is different.");

            var user = _mapper.Map<User>(registerDTO);
            
            var result = await _userManager.CreateAsync(user, registerDTO.Password);
            await _userManager.AddToRoleAsync(user, Role.User);

            if (!result.Succeeded)
            {
                throw new ArgumentException($"Unable to register user {registerDTO.Email}, errors: {GetRegisterError(result.Errors)}");
            }
        }

        public async Task<string> Login(LoginDTO loginDTO)
        {
            var user = await _userManager.FindByEmailAsync(loginDTO.Email);
            if (user == null)
            {
                throw new ArgumentException($"User {loginDTO.Email} does not exist.");
            }
            if (!await _userManager.CheckPasswordAsync(user, loginDTO.Password))
            {
                throw new ArgumentException($"Unable to authenticate user {loginDTO.Email} - wrong password.");
            }

            var token = await _tokenService.CreateTokenJWT(user);
            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            await _cookieService.SetCookies(token, tokenString);

            return tokenString;
        }

        public async Task<IEnumerable<string>> GetRoles()
        {
            var roles = await _roleManager.Roles.ToListAsync();
            return roles.Select(role => role.Name);
        }

        public async Task MakeAnAdmin(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                throw new ArgumentException($"User {userId} does not exist.");

            var unknownUser = await _dbContext.Users
               .Where(u => u.Email == "unknown@unknown.com")
               .SingleOrDefaultAsync();

            if (unknownUser == null)
                throw new InvalidOperationException("Unknown user not found");

            var unknownUserId = unknownUser.Id;

            var removeUserRoleResult = await _userManager.RemoveFromRoleAsync(user, Role.User);
            if (!removeUserRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Failed to remove User role from user {userId}. Errors: {string.Join(", ", removeUserRoleResult.Errors.Select(e => e.Description))}");
            }

            var addAdminRoleResult = await _userManager.AddToRoleAsync(user, Role.Admin);
            if (!addAdminRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Failed to add Admin role to user {userId}. Errors: {string.Join(", ", addAdminRoleResult.Errors.Select(e => e.Description))}");
            }
        }

        public async Task MakeAnUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                throw new ArgumentException($"User {userId} does not exist.");

            var removeAdminRoleResult = await _userManager.RemoveFromRoleAsync(user, Role.Admin);
            if (!removeAdminRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Failed to remove Admin role from user {userId}. Errors: {string.Join(", ", removeAdminRoleResult.Errors.Select(e => e.Description))}");
            }

            var addUserRoleResult = await _userManager.AddToRoleAsync(user, Role.User);
            if (!addUserRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Failed to add User role to user {userId}. Errors: {string.Join(", ", addUserRoleResult.Errors.Select(e => e.Description))}");
            }
        }

        private string GetRegisterError(IEnumerable<IdentityError> errors)
        {
            return string.Join(", ", errors.Select(error => error.Description).ToArray());
        }
    }
}