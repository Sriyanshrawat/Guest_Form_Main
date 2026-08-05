using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateSchoolDto
    {
        [Range(1, int.MaxValue)]
        public int SchoolBoardId { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;
    }

    public class SchoolListItemDto
    {
        public int Id { get; set; }
        public int SchoolBoardId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime InsertedDate { get; set; }
        public string? SchoolBoardName { get; set; }
    }

    public class UpdateSchoolDto : CreateSchoolDto
    {
        public bool IsActive { get; set; } = true;
    }
}
