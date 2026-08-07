using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class StudentCreateDto
    {
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

        [MaxLength(20)]
        public string? RollNumber { get; set; }

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int SessionId { get; set; }

        [Required]
        public int SchoolId { get; set; }

        [Required]
        public int ClassId { get; set; }

        public int? StreamId { get; set; }

        public int? SpecializationId { get; set; }
    }

    public class StudentUpdateDto : StudentCreateDto
    {
    }

    public class StudentResponseDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Address { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }
        public string FatherName { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string FatherPhone { get; set; } = string.Empty;
        public string MotherPhone { get; set; } = string.Empty;
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }
        public string? MotherTongue { get; set; }
        public string? Category { get; set; }
        public string? EnrollmentNumber { get; set; }
        public string? RollNumber { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int SessionId { get; set; }
        public string? SessionName { get; set; }
        public int SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public int ClassId { get; set; }
        public string? ClassName { get; set; }
        public string? ClassSection { get; set; }
        public int? StreamId { get; set; }
        public string? StreamName { get; set; }
        public int? SpecializationId { get; set; }
        public string? SpecializationName { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public string? ReviewedBy { get; set; }
        public DateTime? ReviewedDate { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DeletedDate { get; set; }
    }

    public class StudentRejectDto
    {
        [MaxLength(500)]
        public string? Note { get; set; }
    }

    public class StudentSubmissionCreateDto : StudentCreateDto
    {
    }

    public class StudentSubmissionUpdateDto : StudentCreateDto
    {
    }

    public class StudentSubmissionResponseDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Address { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }
        public string FatherName { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string FatherPhone { get; set; } = string.Empty;
        public string MotherPhone { get; set; } = string.Empty;
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }
        public string? MotherTongue { get; set; }
        public string? Category { get; set; }
        public string? EnrollmentNumber { get; set; }
        public string? RollNumber { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int SessionId { get; set; }
        public string? SessionName { get; set; }
        public int SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public int ClassId { get; set; }
        public string? ClassName { get; set; }
        public string? ClassSection { get; set; }
        public int? StreamId { get; set; }
        public string? StreamName { get; set; }
        public int? SpecializationId { get; set; }
        public string? SpecializationName { get; set; }
        public string Username { get; set; } = string.Empty;
        public int? StudentId { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public string? ReviewedBy { get; set; }
        public DateTime? ReviewedDate { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DeletedDate { get; set; }
    }
}
