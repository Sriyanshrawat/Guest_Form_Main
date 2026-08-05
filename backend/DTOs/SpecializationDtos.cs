using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateSpecializationDto
    {
        [Range(1, int.MaxValue)]
        public int ClassId { get; set; }

        public int? StreamId { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateSpecializationDto : CreateSpecializationDto
    {
        public bool IsActive { get; set; } = true;
    }
}
