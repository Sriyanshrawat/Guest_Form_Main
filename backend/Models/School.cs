using System.ComponentModel.DataAnnotations;

namespace GuestApi.Models
{
    public class School
    {
        public int Id { get; set; }

        public int SchoolBoardId { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        [Required, MaxLength(100)]
        public string InsertedBy { get; set; } = string.Empty;

        public DateTime InsertedDate { get; set; } = DateTime.UtcNow;
        [MaxLength(100)] public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        [MaxLength(100)] public string? DeletedBy { get; set; }
        public DateTime? DeletedDate { get; set; }
    }
}
