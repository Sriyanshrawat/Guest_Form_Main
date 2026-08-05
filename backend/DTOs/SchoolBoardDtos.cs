using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class CreateSchoolBoardDto
    {
        [Required]
        [MaxLength(150)]
        public string name { get; set; } = string.Empty;
    }

    public class UpdateSchoolBoardDto
    {
        [Required]
        [MaxLength(150)]
        public string name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }
}
