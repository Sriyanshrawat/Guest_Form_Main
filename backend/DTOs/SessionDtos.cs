using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateSessionDto
    {
        [Required, MaxLength(150)]
        [RegularExpression(@"^\d{4}-\d{4}$", ErrorMessage = "Session must use the YYYY-YYYY format, for example 2001-2002.")]
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateSessionDto
    {
        [Required, MaxLength(150)]
        [RegularExpression(@"^\d{4}-\d{4}$", ErrorMessage = "Session must use the YYYY-YYYY format, for example 2001-2002.")]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
