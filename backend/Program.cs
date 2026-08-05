using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using GuestApi.Data;
using GuestApi.Models;

// create builder
var builder = WebApplication.CreateBuilder(args);

// register controllers
builder.Services.AddControllers();

// register Dapper
builder.Services.AddScoped<DapperContext>();

// register memory cache
builder.Services.AddMemoryCache();

// register API explorer
builder.Services.AddEndpointsApiExplorer();
// configure Swagger
builder.Services.AddSwaggerGen(options =>
{
    // define Bearer scheme
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Paste the token from /api/auth/login."
    });
    // require Bearer on all ops
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// read connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// register DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    )
);

// read JWT settings
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"];

// register JWT auth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtIssuer,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// register authorization
builder.Services.AddAuthorization();

// CORS policy
const string CorsPolicyName = "AllowAll";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// build app
var app = builder.Build();

// bootstrap schema
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // ensure schema created
    db.Database.EnsureCreated();

    // users table (EnsureCreated never runs on a pre-existing DB, so create it defensively)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `users` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `Username` varchar(100) NOT NULL,
            `PasswordHash` varchar(200) NOT NULL,
            `Role` varchar(20) NOT NULL,
            `CreatedAt` datetime(6) NOT NULL,
            `UpdatedAt` datetime(6) NULL,
            CONSTRAINT `PK_users` PRIMARY KEY (`Id`),
            CONSTRAINT `UX_users_Username` UNIQUE (`Username`)
        );
        """);

    // SchoolBoards table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `SchoolBoards` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `UniversityName` varchar(150) NOT NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_SchoolBoards` PRIMARY KEY (`Id`)
        );
        """);

    // Schools table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Schools` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `SchoolBoardId` int NOT NULL,
            `Name` varchar(150) NOT NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_Schools` PRIMARY KEY (`Id`),
            CONSTRAINT `FK_Schools_SchoolBoards_SchoolBoardId` FOREIGN KEY (`SchoolBoardId`) REFERENCES `SchoolBoards` (`Id`),
            CONSTRAINT `UX_Schools_SchoolBoardId_Name` UNIQUE (`SchoolBoardId`, `Name`)
        );
        """);

    // Classes table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Classes` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `SchoolId` int NULL,
            `Class` varchar(150) NOT NULL,
            `Section` varchar(25) NOT NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_Classes` PRIMARY KEY (`Id`),
            CONSTRAINT `FK_Classes_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `Schools` (`Id`) ON DELETE RESTRICT,
            CONSTRAINT `UX_Classes_SchoolId_Class_Section` UNIQUE (`SchoolId`, `Class`, `Section`)
        );
        """);

    // Streams table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Streams` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `ClassId` int NOT NULL,
            `Name` varchar(150) NOT NULL,
            `Acronym` varchar(25) NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_Streams` PRIMARY KEY (`Id`),
            CONSTRAINT `FK_Streams_Classes_ClassId` FOREIGN KEY (`ClassId`) REFERENCES `Classes` (`Id`) ON DELETE RESTRICT,
            CONSTRAINT `UX_Streams_ClassId_Name` UNIQUE (`ClassId`, `Name`)
        );
        """);

    // migrate: add Streams.Acronym
    var hasStreamAcronymColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Streams' AND column_name = 'Acronym'
        """).AsEnumerable().Single() > 0;

    if (!hasStreamAcronymColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Streams` ADD COLUMN `Acronym` varchar(25) NULL;");
    }

    // Sessions table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Sessions` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `Name` varchar(150) NOT NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_Sessions` PRIMARY KEY (`Id`),
            CONSTRAINT `UX_Sessions_Name` UNIQUE (`Name`)
        );
        """);

    // Specializations table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Specializations` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `ClassId` int NOT NULL,
            `Name` varchar(150) NOT NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `InsertedDate` datetime(6) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_Specializations` PRIMARY KEY (`Id`),
            CONSTRAINT `FK_Specializations_Classes_ClassId` FOREIGN KEY (`ClassId`) REFERENCES `Classes` (`Id`) ON DELETE RESTRICT,
            CONSTRAINT `UX_Specializations_ClassId_Name` UNIQUE (`ClassId`, `Name`)
        );
        """);

    // migrate: add Specializations.StreamId
    var hasSpecializationStreamIdColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Specializations' AND column_name = 'StreamId'
        """).AsEnumerable().Single() > 0;

    if (!hasSpecializationStreamIdColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Specializations` ADD COLUMN `StreamId` int NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Specializations` ADD INDEX `IX_Specializations_StreamId` (`StreamId`);");
    }

    var hasSpecializationStreamForeignKey = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.table_constraints
        WHERE table_schema = DATABASE()
          AND table_name = 'Specializations'
          AND constraint_name = 'FK_Specializations_Streams_StreamId'
          AND constraint_type = 'FOREIGN KEY'
        """).AsEnumerable().Single() > 0;

    if (!hasSpecializationStreamForeignKey)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Specializations` ADD CONSTRAINT `FK_Specializations_Streams_StreamId` FOREIGN KEY (`StreamId`) REFERENCES `Streams` (`Id`) ON DELETE SET NULL;");
    }

    // migrate legacy Classes table
    var hasClassCodeColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Classes' AND column_name = 'Code'
        """).AsEnumerable().Single() > 0;

    if (hasClassCodeColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD COLUMN `Section` varchar(25) NULL;");
        db.Database.ExecuteSqlRaw("UPDATE `Classes` SET `Section` = `Code` WHERE `Section` IS NULL OR `Section` = ''; ");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` MODIFY COLUMN `Section` varchar(25) NOT NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` DROP INDEX `UX_Classes_Name`;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` DROP INDEX `UX_Classes_Code`;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD UNIQUE INDEX `UX_Classes_Name_Section` (`Name`, `Section`);");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` DROP COLUMN `Code`;");
    }

    // migrate: add Classes.SchoolId
    var hasClassSchoolIdColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Classes' AND column_name = 'SchoolId'
        """).AsEnumerable().Single() > 0;

    if (!hasClassSchoolIdColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD COLUMN `SchoolId` int NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` DROP INDEX `UX_Classes_Name_Section`;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD UNIQUE INDEX `UX_Classes_SchoolId_Name_Section` (`SchoolId`, `Name`, `Section`);");
    }

    // migrate: add Classes.SessionId (nullable FK, ON DELETE SET NULL)
    var hasClassSessionIdColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Classes' AND column_name = 'SessionId'
        """).AsEnumerable().Single() > 0;

    if (!hasClassSessionIdColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD COLUMN `SessionId` int NULL;");
    }

    var hasClassesSessionForeignKey = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.table_constraints
        WHERE table_schema = DATABASE()
          AND table_name = 'Classes'
          AND constraint_name = 'FK_Classes_Sessions'
          AND constraint_type = 'FOREIGN KEY'
        """).AsEnumerable().Single() > 0;

    if (!hasClassesSessionForeignKey)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD CONSTRAINT `FK_Classes_Sessions` FOREIGN KEY (`SessionId`) REFERENCES `Sessions` (`Id`) ON DELETE SET NULL;");
    }

    // migrate: rename Classes.Name -> Class
    var hasLegacyNameColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Classes' AND column_name = 'Name'
        """).AsEnumerable().Single() > 0;

    if (hasLegacyNameColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` CHANGE COLUMN `Name` `Class` varchar(150) NOT NULL;");
    }

    // migrate: rename Classes.ClassName -> Class
    var hasClassNameColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Classes' AND column_name = 'ClassName'
        """).AsEnumerable().Single() > 0;

    if (hasClassNameColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` CHANGE COLUMN `ClassName` `Class` varchar(150) NOT NULL;");
    }

    // add Classes->Schools FK
    var hasClassesSchoolForeignKey = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.table_constraints
        WHERE table_schema = DATABASE()
          AND table_name = 'Classes'
          AND constraint_name = 'FK_Classes_Schools_SchoolId'
          AND constraint_type = 'FOREIGN KEY'
        """).AsEnumerable().Single() > 0;

    if (!hasClassesSchoolForeignKey)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Classes` ADD CONSTRAINT `FK_Classes_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `Schools` (`Id`) ON DELETE RESTRICT;");
    }

    // seed default admin
    if (!db.Users.Any())
    {
        db.Users.Add(new User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456789"),
            Role = "Admin",
            CreatedAt = DateTime.UtcNow
        });

        db.SaveChanges();
    }

    // FullConfigurations table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `FullConfigurations` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `BoardId` int NOT NULL,
            `BoardName` varchar(150) NOT NULL,
            `SessionId` int NOT NULL,
            `SessionName` varchar(150) NOT NULL,
            `SchoolId` int NOT NULL,
            `SchoolName` varchar(150) NOT NULL,
            `ClassId` int NOT NULL,
            `ClassName` varchar(150) NOT NULL,
            `ClassSection` varchar(25) NOT NULL,
            `CreatedBy` varchar(100) NOT NULL,
            `CreatedAt` datetime(6) NOT NULL,
            `Specializations` varchar(1000) NULL,
            `Streams` varchar(1000) NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            CONSTRAINT `PK_FullConfigurations` PRIMARY KEY (`Id`)
        );
        """);

    // migrate: add FullConfigurations.IsActive
    var hasIsActive = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'FullConfigurations' AND column_name = 'IsActive'
        """).AsEnumerable().Single() > 0;

    if (!hasIsActive)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `FullConfigurations` ADD COLUMN `IsActive` tinyint(1) NOT NULL DEFAULT 1;");
    }

    // migrate: add FullConfigurations.DeletedBy
    var hasDeletedBy = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'FullConfigurations' AND column_name = 'DeletedBy'
        """).AsEnumerable().Single() > 0;

    if (!hasDeletedBy)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `FullConfigurations` ADD COLUMN `DeletedBy` varchar(100) NULL;");
    }

    // migrate: add FullConfigurations.DeletedDate
    var hasDeletedDate = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'FullConfigurations' AND column_name = 'DeletedDate'
        """).AsEnumerable().Single() > 0;

    if (!hasDeletedDate)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `FullConfigurations` ADD COLUMN `DeletedDate` datetime(6) NULL;");
    }

    // Students table
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `Students` (
            `Id` int NOT NULL AUTO_INCREMENT,
            `FirstName` varchar(100) NOT NULL,
            `LastName` varchar(100) NOT NULL,
            `Gender` varchar(10) NOT NULL,
            `DateOfBirth` datetime(6) NOT NULL,
            `Email` varchar(150) NOT NULL,
            `PhoneNumber` varchar(20) NULL,
            `Address` varchar(200) NOT NULL,
            `BloodGroup` varchar(10) NULL,
            `FatherName` varchar(150) NOT NULL,
            `MotherName` varchar(150) NOT NULL,
            `FatherPhone` varchar(20) NOT NULL,
            `MotherPhone` varchar(20) NOT NULL,
            `EmergencyContactName` varchar(150) NULL,
            `EmergencyContactPhone` varchar(20) NULL,
            `AadhaarNumber` varchar(20) NULL,
            `Nationality` varchar(50) NULL,
            `Religion` varchar(50) NULL,
            `MotherTongue` varchar(50) NULL,
            `Category` varchar(20) NULL,
            `EnrollmentNumber` varchar(20) NULL,
            `RollNumber` varchar(20) NULL,
            `BoardId` int NOT NULL,
            `SessionId` int NOT NULL,
            `SchoolId` int NOT NULL,
            `ClassId` int NOT NULL,
            `StreamId` int NULL,
            `SpecializationId` int NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `InsertedBy` varchar(100) NOT NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            `CreatedAt` datetime(6) NOT NULL,
            CONSTRAINT `PK_Students` PRIMARY KEY (`Id`),
            CONSTRAINT `UX_Students_Email` UNIQUE (`Email`)
        );
        """);

    // migrate: add Students soft-delete columns
    var hasStudentIsActiveColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Students' AND column_name = 'IsActive'
        """).AsEnumerable().Single() > 0;

    if (!hasStudentIsActiveColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `IsActive` tinyint(1) NOT NULL DEFAULT 1;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `InsertedBy` varchar(100) NOT NULL DEFAULT '';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `UpdatedBy` varchar(100) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `UpdatedDate` datetime(6) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `DeletedBy` varchar(100) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `DeletedDate` datetime(6) NULL;");
    }

    // migrate: add Student guardian fields
    var hasStudentFatherNameColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Students' AND column_name = 'FatherName'
        """).AsEnumerable().Single() > 0;

    if (!hasStudentFatherNameColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `FatherName` varchar(150) NOT NULL DEFAULT '';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `MotherName` varchar(150) NOT NULL DEFAULT '';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `FatherPhone` varchar(20) NOT NULL DEFAULT '';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `MotherPhone` varchar(20) NOT NULL DEFAULT '';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `EmergencyContactName` varchar(150) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `EmergencyContactPhone` varchar(20) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `AadhaarNumber` varchar(20) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `Nationality` varchar(50) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `Religion` varchar(50) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `MotherTongue` varchar(50) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `Category` varchar(20) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `EnrollmentNumber` varchar(20) NULL;");
    }
}

// Swagger UI (dev only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // persist authorize token
        options.ConfigObject.PersistAuthorization = true;
    });
}

// redirect to HTTPS
app.UseHttpsRedirection();

// apply CORS
app.UseCors(CorsPolicyName);

// auth middleware
app.UseAuthentication();
app.UseAuthorization();

// map controllers
app.MapControllers();

// run
app.Run();