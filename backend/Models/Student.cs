using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GuestApi.Models
{
    public class Student
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required, EmailAddress, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [Required, MaxLength(200)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [Required, MaxLength(150)]
        public string FatherName { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string MotherName { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string FatherPhone { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string MotherPhone { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? EmergencyContactName { get; set; }

        [MaxLength(20)]
        public string? EmergencyContactPhone { get; set; }

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? MotherTongue { get; set; }

        [MaxLength(20)]
        public string? Category { get; set; }

        [MaxLength(20)]
        public string? EnrollmentNumber { get; set; }

        public int BoardId { get; set; }

        public int SessionId { get; set; }

        public int SchoolId { get; set; }

        public int ClassId { get; set; }

        public int? StreamId { get; set; }

        public int? SpecializationId { get; set; }

        public bool IsActive { get; set; } = true;

        [MaxLength(100)]
        public string InsertedBy { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        [MaxLength(100)]
        public string? DeletedBy { get; set; }

        public DateTime? DeletedDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
