using Dapper;
using GuestApi.Data;
using GuestApi.DTOs;
using GuestApi.Helpers;
using GuestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
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
        // the browser stores the JWT as an HttpOnly cookie named this
        private const string AuthCookieName = "auth_token";

        private readonly DapperContext _db;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _captchaCache;

        // resolves dependencies for DB access, config, and CAPTCHA cache
        public AuthController(DapperContext db, IConfiguration config, IMemoryCache captchaCache)
        {
            _db = db;
            _config = config;
            _captchaCache = captchaCache;
        }

        // get captcha
        [HttpGet("captcha")]
        [EnableRateLimiting("auth")]
        public ActionResult<CaptchaResponseDto> GetCaptcha()
        {
            var captcha = CaptchaGenerator.GenerateCaptcha();
            _captchaCache.Set(captcha.CaptchaId, captcha.CaptchaText, TimeSpan.FromMinutes(5));
            return Ok(new CaptchaResponseDto { CaptchaId = captcha.CaptchaId, ImageBase64 = captcha.ImageBase64 });
        }

        // register
        [HttpPost("register")]
        [EnableRateLimiting("auth")]
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
            SetAuthCookie(token);
            return Ok(new AuthResponseDto { Username = user.Username, Role = user.Role, ProfilePicture = user.ProfilePicture });
        }

        // login
        [HttpPost("login")]
        [EnableRateLimiting("auth")]
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
            SetAuthCookie(token);
            return Ok(new AuthResponseDto { Username = user.Username, Role = user.Role, ProfilePicture = user.ProfilePicture });
        }

        // clear the auth cookie (the JWT cannot be revoked client-side because
        // it is HttpOnly, so the SPA calls this on logout)
        [Authorize]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            ClearAuthCookie();
            return Ok(new { message = "Logged out." });
        }

        // update profile picture
        [Authorize]
        [HttpPost("profile-picture")]
        public async Task<ActionResult<AuthResponseDto>> UpdateProfilePicture(UpdateProfilePictureDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "Unable to identify the current user." });

            var picture = dto.ProfilePicture?.Trim();
            if (picture == null)
                return BadRequest(new { message = "Please choose an image to upload." });

            // empty means "clear the picture"
            string? storedPicture = null;
            if (picture.Length > 0)
            {
                // only accept base64 data URIs for raster images
                if (!picture.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "Invalid image data." });
                storedPicture = picture;
            }

            using var conn = _db.CreateConnection();

            var user = await conn.QuerySingleOrDefaultAsync<User>(
                StoredProcedures.Users_GetByUsername,
                new { pUsername = username },
                commandType: CommandType.StoredProcedure);
            if (user == null)
                return Unauthorized(new { message = "Account not found." });

            // persist the new profile picture
            var updated = await conn.QuerySingleAsync<User>(
                StoredProcedures.Users_UpdateProfilePicture,
                new { pUsername = username, pProfilePicture = storedPicture },
                commandType: CommandType.StoredProcedure);

            var token = GenerateJwt(updated);
            SetAuthCookie(token);
            return Ok(new AuthResponseDto { Username = updated.Username, Role = updated.Role, ProfilePicture = updated.ProfilePicture });
        }

        // change username
        [Authorize]
        [HttpPost("username")]
        public async Task<ActionResult<AuthResponseDto>> UpdateUsername(UpdateUsernameDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "Unable to identify the current user." });

            var newUsername = dto.NewUsername.Trim();
            if (newUsername.Length < 3 || newUsername.Length > 50)
                return BadRequest(new { message = "The username must be between 3 and 50 characters." });

            using var conn = _db.CreateConnection();

            var user = await conn.QuerySingleOrDefaultAsync<User>(
                StoredProcedures.Users_GetByUsername,
                new { pUsername = username },
                commandType: CommandType.StoredProcedure);
            if (user == null)
                return Unauthorized(new { message = "Account not found." });

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Your current password is incorrect." });

            if (string.Equals(username, newUsername, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "That is already your current username." });

            // ensure the new username is free
            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Users_UsernameExists,
                new { pUsername = newUsername },
                commandType: CommandType.StoredProcedure);
            if (exists > 0)
                return Conflict(new { message = "That username is already taken." });

            // rename the account and all references that link it to its data
            var updated = await conn.QuerySingleAsync<User>(
                StoredProcedures.Users_UpdateUsername,
                new { pCurrentUsername = username, pNewUsername = newUsername },
                commandType: CommandType.StoredProcedure);

            var token = GenerateJwt(updated);
            SetAuthCookie(token);
            return Ok(new AuthResponseDto { Username = updated.Username, Role = updated.Role, ProfilePicture = updated.ProfilePicture });
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
            if (!_captchaCache.TryGetValue<string>(captchaId, out var expectedAnswer))
                return false;

            // single-use: consume the code on first attempt
            _captchaCache.Remove(captchaId);
            return string.Equals(expectedAnswer, captchaAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        // persist the JWT in an HttpOnly cookie so it stays out of reach of
        // client-side JS (localStorage is XSS-readable; a cookie is not)
        private void SetAuthCookie(string token)
        {
            Response.Cookies.Append(AuthCookieName, token, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddHours(8)
            });
        }

        // expire the auth cookie on logout
        private void ClearAuthCookie()
        {
            Response.Cookies.Delete(AuthCookieName, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/"
            });
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