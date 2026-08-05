using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateClassDto
    {
        [Range(1, int.MaxValue)] public int SchoolId { get; set; }
        public int? SessionId { get; set; }
        [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
        [Required, MaxLength(25)] public string Section { get; set; } = string.Empty;
    }

    public class UpdateClassDto
    {
        [Range(1, int.MaxValue)] public int SchoolId { get; set; }
        public int? SessionId { get; set; }
        [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
        [Required, MaxLength(25)] public string Section { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
