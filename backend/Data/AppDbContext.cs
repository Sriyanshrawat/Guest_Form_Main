using Microsoft.EntityFrameworkCore;
using GuestApi.Models;
using Stream = GuestApi.Models.Stream;

namespace GuestApi.Data
{
    public class AppDbContext : DbContext
    {
        // constructor
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<SchoolBoard> SchoolBoards { get; set; } = null!;
        public DbSet<School> Schools { get; set; } = null!;
        public DbSet<ClassRecord> Classes { get; set; } = null!;
        public DbSet<Stream> Streams { get; set; } = null!;
        public DbSet<Session> Sessions { get; set; } = null!;
        public DbSet<Specialization> Specializations { get; set; } = null!;
        public DbSet<FullConfiguration> FullConfigurations { get; set; } = null!;
        public DbSet<Student> Students { get; set; } = null!;

        // configure entity mappings
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");
                entity.HasIndex(u => u.Username).IsUnique();
            });

            modelBuilder.Entity<SchoolBoard>(entity =>
            {
                entity.ToTable("SchoolBoards");
                entity.Property(e => e.UniversityName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
            });

            modelBuilder.Entity<School>(entity =>
            {
                entity.ToTable("Schools");
                entity.HasIndex(e => new { e.SchoolBoardId, e.Name }).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
                entity.HasOne<SchoolBoard>()
                    .WithMany()
                    .HasForeignKey(e => e.SchoolBoardId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ClassRecord>(entity =>
            {
                entity.ToTable("Classes");
                entity.HasIndex(e => new { e.SchoolId, e.Name, e.Section }).IsUnique();
                entity.Property(e => e.Name).HasColumnName("Class").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Section).HasMaxLength(25).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
                entity.Ignore(e => e.SchoolName);
                entity.Ignore(e => e.SessionName);
                entity.HasOne<School>()
                    .WithMany()
                    .HasForeignKey(e => e.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne<Session>()
                    .WithMany()
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Stream>(entity =>
            {
                entity.ToTable("Streams");
                entity.HasIndex(e => new { e.ClassId, e.Name }).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
                entity.Ignore(e => e.ClassName);
                entity.Ignore(e => e.ClassSection);
                entity.Ignore(e => e.SchoolName);
                entity.HasOne<ClassRecord>()
                    .WithMany()
                    .HasForeignKey(e => e.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Session>(entity =>
            {
                entity.ToTable("Sessions");
                entity.HasIndex(e => e.Name).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
            });

            modelBuilder.Entity<FullConfiguration>(entity =>
            {
                entity.ToTable("FullConfigurations");
                entity.Property(e => e.BoardName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.SessionName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.SchoolName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.ClassName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.ClassSection).HasMaxLength(25).IsRequired();
                entity.Property(e => e.CreatedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.UpdatedDate).HasColumnType("datetime(6)");
                entity.Property(e => e.Specializations).HasMaxLength(1000);
                entity.Property(e => e.Streams).HasMaxLength(1000);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
            });

            modelBuilder.Entity<Specialization>(entity =>
            {
                entity.ToTable("Specializations");
                entity.HasIndex(e => new { e.ClassId, e.Name }).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
                entity.Ignore(e => e.ClassName);
                entity.Ignore(e => e.ClassSection);
                entity.Ignore(e => e.SchoolName);
                entity.Ignore(e => e.StreamName);
                entity.Ignore(e => e.StreamAcronym);
                entity.HasOne<ClassRecord>()
                    .WithMany()
                    .HasForeignKey(e => e.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne<Stream>()
                    .WithMany()
                    .HasForeignKey(e => e.StreamId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Student>(entity =>
            {
                entity.ToTable("Students");
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Gender).HasMaxLength(10).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(150).IsRequired();
                entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                entity.Property(e => e.Address).HasMaxLength(200).IsRequired();
                entity.Property(e => e.BloodGroup).HasMaxLength(10);
                entity.Property(e => e.FatherName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.MotherName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.FatherPhone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.MotherPhone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.EmergencyContactName).HasMaxLength(150);
                entity.Property(e => e.EmergencyContactPhone).HasMaxLength(20);
                entity.Property(e => e.AadhaarNumber).HasMaxLength(20);
                entity.Property(e => e.Nationality).HasMaxLength(50);
                entity.Property(e => e.Religion).HasMaxLength(50);
                entity.Property(e => e.MotherTongue).HasMaxLength(50);
                entity.Property(e => e.Category).HasMaxLength(20);
                entity.Property(e => e.EnrollmentNumber).HasMaxLength(20);
                entity.Property(e => e.RollNumber).HasMaxLength(20);
                entity.Property(e => e.IsActive).HasColumnType("tinyint(1)");
                entity.Property(e => e.InsertedBy).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UpdatedBy).HasMaxLength(100);
                entity.Property(e => e.UpdatedDate).HasColumnType("datetime(6)");
                entity.Property(e => e.DeletedBy).HasMaxLength(100);
                entity.Property(e => e.DeletedDate).HasColumnType("datetime(6)");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
