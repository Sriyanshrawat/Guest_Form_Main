using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class RegisterDto
    {
        [Required, MinLength(3), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string CaptchaId { get; set; } = string.Empty;

        [Required]
        public string CaptchaAnswer { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string CaptchaId { get; set; } = string.Empty;

        [Required]
        public string CaptchaAnswer { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class CaptchaResponseDto
    {
        public string CaptchaId { get; set; } = string.Empty;

        public string ImageBase64 { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        // NOTE: the JWT is deliberately not returned in the body. The server
        // sets it as an HttpOnly cookie instead, keeping it out of JS scope.

        public string Username { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string? ProfilePicture { get; set; }
    }

    public class UpdateProfilePictureDto
    {
        public string? ProfilePicture { get; set; }
    }

    public class UpdateUsernameDto
    {
        [Required, MinLength(3), MaxLength(50)]
        public string NewUsername { get; set; } = string.Empty;

        [Required]
        public string CurrentPassword { get; set; } = string.Empty;
    }
}
