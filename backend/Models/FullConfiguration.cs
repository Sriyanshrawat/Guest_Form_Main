using System.ComponentModel.DataAnnotations;

namespace GuestApi.Models
{
    public class FullConfiguration
    {
        public int Id { get; set; }

        public int BoardId { get; set; }

        [MaxLength(150)]
        public string BoardName { get; set; } = string.Empty;

        public int SessionId { get; set; }

        [MaxLength(150)]
        public string SessionName { get; set; } = string.Empty;

        public int SchoolId { get; set; }

        [MaxLength(150)]
        public string SchoolName { get; set; } = string.Empty;

        public int ClassId { get; set; }

        [MaxLength(150)]
        public string ClassName { get; set; } = string.Empty;

        [MaxLength(25)]
        public string ClassSection { get; set; } = string.Empty;

        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(1000)]
        public string Specializations { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Streams { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        [MaxLength(100)]
        public string? DeletedBy { get; set; }

        public DateTime? DeletedDate { get; set; }
    }
}
