using Microsoft.AspNetCore.Mvc;

namespace ChatLab.CoreService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetUsers() => Ok(new[] { new { id = 1, name = "Demo User" } });
}
