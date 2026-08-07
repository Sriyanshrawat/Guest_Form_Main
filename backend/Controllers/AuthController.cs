using Dapper;
using GuestApi.Data;
using GuestApi.DTOs;
using GuestApi.Helpers;
using GuestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GuestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DapperContext _db;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _captchaCache;
        private readonly IHostEnvironment _env;

        // resolves dependencies for DB access, config, CAPTCHA cache, and environment
        public AuthController(DapperContext db, IConfiguration config, IMemoryCache captchaCache, IHostEnvironment env)
        {
            _db = db;
            _config = config;
            _captchaCache = captchaCache;
            _env = env;
        }

        // get captcha
        [HttpGet("captcha")]
        public ActionResult<CaptchaResponseDto> GetCaptcha()
        {
            var captcha = CaptchaGenerator.GenerateCaptcha();
            _captchaCache.Set(captcha.CaptchaId, captcha.CaptchaText, TimeSpan.FromMinutes(5));
            return Ok(new CaptchaResponseDto { CaptchaId = captcha.CaptchaId, ImageBase64 = captcha.ImageBase64 });
        }

        // register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!IsCaptchaValid(dto.CaptchaId, dto.CaptchaAnswer))
                return BadRequest(new { message = "The CAPTCHA is incorrect or has expired." });

            using var conn = _db.CreateConnection();

            // check username is free
            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Users_UsernameExists,
                new { pUsername = dto.Username },
                commandType: CommandType.StoredProcedure);
            if (exists > 0)
                return Conflict(new { message = "That username is already taken." });

            // create account with hashed password
            var user = await conn.QuerySingleAsync<User>(
                StoredProcedures.Users_Create,
                new { pUsername = dto.Username, pPasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password), pRole = "User" },
                commandType: CommandType.StoredProcedure);

            // mint token for the new account
            var token = GenerateJwt(user);
            return Ok(new AuthResponseDto { Token = token, Username = user.Username, Role = user.Role });
        }

        // login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!IsCaptchaValid(dto.CaptchaId, dto.CaptchaAnswer))
                return BadRequest(new { message = "The CAPTCHA is incorrect or has expired." });

            using var conn = _db.CreateConnection();

            // verify credentials against stored BCrypt hash
            var user = await conn.QuerySingleOrDefaultAsync<User>(
                StoredProcedures.Users_GetByUsername,
                new { pUsername = dto.Username },
                commandType: CommandType.StoredProcedure);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid username or password." });

            var token = GenerateJwt(user);
            return Ok(new AuthResponseDto { Token = token, Username = user.Username, Role = user.Role });
        }

        // change password
        [Authorize]
        [HttpPost("change-password")]
        public async Task<ActionResult> ChangePassword(ChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "Unable to identify the current user." });

            using var conn = _db.CreateConnection();

            var user = await conn.QuerySingleOrDefaultAsync<User>(
                StoredProcedures.Users_GetByUsername,
                new { pUsername = username },
                commandType: CommandType.StoredProcedure);
            if (user == null)
                return Unauthorized(new { message = "Account not found." });

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Your current password is incorrect." });

            // persist only the new password hash
            await conn.ExecuteAsync(
                StoredProcedures.Users_UpdatePassword,
                new { pUsername = username, pPasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword) },
                commandType: CommandType.StoredProcedure);

            return Ok(new { message = "Password changed successfully." });
        }

        // validate captcha
        private bool IsCaptchaValid(string captchaId, string captchaAnswer)
        {
            // skip captcha in development
            if (_env.IsDevelopment())
                return true;

            if (!_captchaCache.TryGetValue<string>(captchaId, out var expectedAnswer))
                return false;

            _captchaCache.Remove(captchaId);
            return string.Equals(expectedAnswer, captchaAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        // build signed JWT
        private string GenerateJwt(User user)
        {
            var jwtKey = _config["Jwt:Key"]!;
            var jwtIssuer = _config["Jwt:Issuer"];

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtIssuer,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}