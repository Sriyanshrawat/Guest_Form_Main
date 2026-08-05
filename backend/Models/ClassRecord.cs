using System.ComponentModel.DataAnnotations;

namespace GuestApi.Models
{
    public class ClassRecord
    {
        public int Id { get; set; }

        public int? SchoolId { get; set; }

        public int? SessionId { get; set; }

        [MaxLength(150)]
        public string? SchoolName { get; set; }

        [MaxLength(150)]
        public string? SessionName { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(25)]
        public string Section { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
        [Required, MaxLength(100)] public string InsertedBy { get; set; } = string.Empty;
        public DateTime InsertedDate { get; set; } = DateTime.UtcNow;
        [MaxLength(100)] public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        [MaxLength(100)] public string? DeletedBy { get; set; }
        public DateTime? DeletedDate { get; set; }
    }
}
