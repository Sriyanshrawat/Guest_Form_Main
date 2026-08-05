using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateStreamDto
    {
        [Range(1, int.MaxValue)] public int ClassId { get; set; }
        [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
        [MaxLength(25)] public string? Acronym { get; set; }
    }

    public class UpdateStreamDto : CreateStreamDto
    {
        public bool IsActive { get; set; } = true;
    }
}
