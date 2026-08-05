using System.ComponentModel.DataAnnotations;

namespace GuestApi.DTOs
{
    public class LookupOptionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Subtitle { get; set; }
    }

    public class SaveConfigurationDto
    {
        [Required]
        public int BoardId { get; set; }

        [Required, MaxLength(150)]
        public string BoardName { get; set; } = string.Empty;

        [Required]
        public int SessionId { get; set; }

        [Required, MaxLength(150)]
        public string SessionName { get; set; } = string.Empty;

        [Required]
        public int SchoolId { get; set; }

        [Required, MaxLength(150)]
        public string SchoolName { get; set; } = string.Empty;

        [Required]
        public int ClassId { get; set; }

        [Required, MaxLength(150)]
        public string ClassName { get; set; } = string.Empty;

        [Required, MaxLength(25)]
        public string ClassSection { get; set; } = string.Empty;
    }

    public class ConfigurationListItemDto
    {
        public int Id { get; set; }
        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int SessionId { get; set; }
        public string SessionName { get; set; } = string.Empty;
        public int SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public string Specializations { get; set; } = string.Empty;
        public string Streams { get; set; } = string.Empty;
    }

    public class SpecializationDetailsDto
    {
        public int SessionId { get; set; }
        public string SessionName { get; set; } = string.Empty;

        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;

        public int SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;

        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;

        public List<LookupOptionDto> Streams { get; set; } = new();
        public List<LookupOptionDto> Specializations { get; set; } = new();
    }
}
