using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using GuestApi.Data;
using GuestApi.Models;
using MySqlConnector;

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

// fail fast on placeholder/weak secrets so a misconfigured server never
// starts (the committed appsettings.json only contains templates)
if (string.IsNullOrWhiteSpace(jwtKey)
    || jwtKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
    || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is not configured. Provide a real signing key of at least 32 characters " +
        "(appsettings.Development.json, appsettings.{Environment}.json or the Jwt__Key environment variable).");
}

if (connectionString?.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase) == true)
{
    throw new InvalidOperationException(
        "DefaultConnection still uses the placeholder password 'CHANGE_ME'. " +
        "Set the real database password in appsettings.Development.json or an environment variable.");
}

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

    // prefer the Authorization header (Swagger/API tooling) but fall back to
    // the HttpOnly auth cookie the SPA relies on
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (string.IsNullOrEmpty(context.Token)
                && context.Request.Cookies.TryGetValue("auth_token", out var cookieToken))
            {
                context.Token = cookieToken;
            }
            return Task.CompletedTask;
        }
    };
});

// register authorization
builder.Services.AddAuthorization();

// fixed-window rate limiter for the brute-forceable auth endpoints
const string RateLimitPolicyAuth = "auth";
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicyAuth, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

// CORS policy
const string CorsPolicyName = "AllowAll";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        // The SPA authenticates with an HttpOnly cookie, so the browser must be
        // allowed to send credentials. ASP.NET forbids AllowAnyOrigin combined
        // with AllowCredentials, so mirror the request origin explicitly.
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
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

    // migrate: add users.ProfilePicture (base64 data URI, nullable)
    var hasUsersProfilePictureColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'ProfilePicture'
        """).AsEnumerable().Single() > 0;

    if (!hasUsersProfilePictureColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `users` ADD COLUMN `ProfilePicture` LONGTEXT NULL;");
    }

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

    // seed default admin with a freshly generated, random password so no
    // well-known credentials ever ship with the codebase
    if (!db.Users.Any())
    {
        var generatedPassword = GenerateStrongPassword(16);
        db.Users.Add(new User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
            Role = "Admin",
            CreatedAt = DateTime.UtcNow
        });

        db.SaveChanges();

        Console.WriteLine("===============================================================================");
        Console.WriteLine("  A default 'admin' account was created with a generated password.");
        Console.WriteLine($"      username: admin");
        Console.WriteLine($"      password: {generatedPassword}");
        Console.WriteLine("  Log in and change it immediately from the profile menu.");
        Console.WriteLine("===============================================================================");
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

    // Students table (approved registry)
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
            `BoardId` int NOT NULL,
            `SessionId` int NOT NULL,
            `SchoolId` int NOT NULL,
            `ClassId` int NOT NULL,
            `StreamId` int NULL,
            `SpecializationId` int NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `Status` varchar(20) NOT NULL DEFAULT 'Pending',
            `ReviewNote` varchar(500) NULL,
            `ReviewedBy` varchar(100) NULL,
            `ReviewedDate` datetime(6) NULL,
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

    // StudentSubmissions table (application queue). A registration lives here
    // until an admin approves it; only APPROVED submissions are copied into
    // the Students table (the approved registry).
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS `StudentSubmissions` (
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
            `BoardId` int NOT NULL,
            `SessionId` int NOT NULL,
            `SchoolId` int NOT NULL,
            `ClassId` int NOT NULL,
            `StreamId` int NULL,
            `SpecializationId` int NULL,
            `Username` varchar(100) NOT NULL,
            `StudentId` int NULL,
            `IsActive` tinyint(1) NOT NULL DEFAULT 1,
            `Status` varchar(20) NOT NULL DEFAULT 'Pending',
            `ReviewNote` varchar(500) NULL,
            `ReviewedBy` varchar(100) NULL,
            `ReviewedDate` datetime(6) NULL,
            `UpdatedBy` varchar(100) NULL,
            `UpdatedDate` datetime(6) NULL,
            `DeletedBy` varchar(100) NULL,
            `DeletedDate` datetime(6) NULL,
            `CreatedAt` datetime(6) NOT NULL,
            CONSTRAINT `PK_StudentSubmissions` PRIMARY KEY (`Id`)
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

    // migrate: add Students verification columns (Status, review audit)
    var hasStudentStatusColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Students' AND column_name = 'Status'
        """).AsEnumerable().Single() > 0;

    if (!hasStudentStatusColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `Status` varchar(20) NOT NULL DEFAULT 'Pending';");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `ReviewNote` varchar(500) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `ReviewedBy` varchar(100) NULL;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` ADD COLUMN `ReviewedDate` datetime(6) NULL;");

        // backfill: existing live students are treated as already approved so the
        // new verification workflow doesn't suddenly flag every current record as pending.
        db.Database.ExecuteSqlRaw("""
            UPDATE `Students`
            SET `Status` = 'Approved'
            WHERE `Status` = 'Pending' AND `IsActive` = 1 AND `DeletedDate` IS NULL;
            """);
    }

    // migrate: drop RollNumber column (Students and StudentSubmissions)
    var hasStudentRollNumberColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Students' AND column_name = 'RollNumber'
        """).AsEnumerable().Single() > 0;

    if (hasStudentRollNumberColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `Students` DROP COLUMN `RollNumber`;");
    }

    var hasSubmissionRollNumberColumn = db.Database.SqlQueryRaw<int>("""
        SELECT COUNT(*) AS `Value`
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'StudentSubmissions' AND column_name = 'RollNumber'
        """).AsEnumerable().Single() > 0;

    if (hasSubmissionRollNumberColumn)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE `StudentSubmissions` DROP COLUMN `RollNumber`;");
    }

    // ---------------------------------------------------------------------
    // Referential integrity: add foreign keys to Students/StudentSubmissions
    // ---------------------------------------------------------------------
    // Repair orphaned rows first so the constraints can be created. Nullable
    // references (stream/specialization) are reset to NULL; rows whose
    // required parents no longer exist are broken data and are removed.
    db.Database.ExecuteSqlRaw("UPDATE `Students` SET `StreamId` = NULL WHERE `StreamId` IS NOT NULL AND `StreamId` NOT IN (SELECT `Id` FROM `Streams`);");
    db.Database.ExecuteSqlRaw("UPDATE `Students` SET `SpecializationId` = NULL WHERE `SpecializationId` IS NOT NULL AND `SpecializationId` NOT IN (SELECT `Id` FROM `Specializations`);");
    db.Database.ExecuteSqlRaw("UPDATE `StudentSubmissions` SET `StreamId` = NULL WHERE `StreamId` IS NOT NULL AND `StreamId` NOT IN (SELECT `Id` FROM `Streams`);");
    db.Database.ExecuteSqlRaw("UPDATE `StudentSubmissions` SET `SpecializationId` = NULL WHERE `SpecializationId` IS NOT NULL AND `SpecializationId` NOT IN (SELECT `Id` FROM `Specializations`);");
    db.Database.ExecuteSqlRaw("DELETE FROM `Students` WHERE `BoardId` NOT IN (SELECT `Id` FROM `SchoolBoards`) OR `SessionId` NOT IN (SELECT `Id` FROM `Sessions`) OR `SchoolId` NOT IN (SELECT `Id` FROM `Schools`) OR `ClassId` NOT IN (SELECT `Id` FROM `Classes`);");
    db.Database.ExecuteSqlRaw("DELETE FROM `StudentSubmissions` WHERE `BoardId` NOT IN (SELECT `Id` FROM `SchoolBoards`) OR `SessionId` NOT IN (SELECT `Id` FROM `Sessions`) OR `SchoolId` NOT IN (SELECT `Id` FROM `Schools`) OR `ClassId` NOT IN (SELECT `Id` FROM `Classes`);");

    AddForeignKeyIfMissing(db, "Students", "FK_Students_SchoolBoards_BoardId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_SchoolBoards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `SchoolBoards` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "Students", "FK_Students_Sessions_SessionId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_Sessions_SessionId` FOREIGN KEY (`SessionId`) REFERENCES `Sessions` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "Students", "FK_Students_Schools_SchoolId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `Schools` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "Students", "FK_Students_Classes_ClassId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_Classes_ClassId` FOREIGN KEY (`ClassId`) REFERENCES `Classes` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "Students", "FK_Students_Streams_StreamId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_Streams_StreamId` FOREIGN KEY (`StreamId`) REFERENCES `Streams` (`Id`) ON DELETE SET NULL;");
    AddForeignKeyIfMissing(db, "Students", "FK_Students_Specializations_SpecializationId",
        "ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_Specializations_SpecializationId` FOREIGN KEY (`SpecializationId`) REFERENCES `Specializations` (`Id`) ON DELETE SET NULL;");

    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_SchoolBoards_BoardId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_SchoolBoards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `SchoolBoards` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_Sessions_SessionId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_Sessions_SessionId` FOREIGN KEY (`SessionId`) REFERENCES `Sessions` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_Schools_SchoolId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `Schools` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_Classes_ClassId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_Classes_ClassId` FOREIGN KEY (`ClassId`) REFERENCES `Classes` (`Id`) ON DELETE RESTRICT;");
    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_Streams_StreamId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_Streams_StreamId` FOREIGN KEY (`StreamId`) REFERENCES `Streams` (`Id`) ON DELETE SET NULL;");
    AddForeignKeyIfMissing(db, "StudentSubmissions", "FK_StudentSubmissions_Specializations_SpecializationId",
        "ALTER TABLE `StudentSubmissions` ADD CONSTRAINT `FK_StudentSubmissions_Specializations_SpecializationId` FOREIGN KEY (`SpecializationId`) REFERENCES `Specializations` (`Id`) ON DELETE SET NULL;");

    // ---------------------------------------------------------------------
    // Enforce email uniqueness across ACTIVE applications (pending/approved)
    // without breaking the re-apply-after-rejection flow. A generated column
    // yields the email only for rows we care about; NULLs never collide, so
    // rejected/deleted submissions can share an email freely.
    // ---------------------------------------------------------------------
    if (!HasIndex(db, "StudentSubmissions", "UX_StudentSubmissions_ActiveEmail"))
    {
        db.Database.ExecuteSqlRaw("""
            DELETE s1 FROM `StudentSubmissions` s1
            INNER JOIN `StudentSubmissions` s2
                ON s2.Email = s1.Email AND s2.Id < s1.Id
               AND s2.IsActive = 1 AND s2.Status IN ('Pending', 'Approved')
            WHERE s1.IsActive = 1 AND s1.Status IN ('Pending', 'Approved');
            """);
        db.Database.ExecuteSqlRaw("ALTER TABLE `StudentSubmissions` ADD COLUMN `ActiveEmail` varchar(150) GENERATED ALWAYS AS (IF(`IsActive` = 1 AND `Status` IN ('Pending', 'Approved'), `Email`, NULL)) STORED;");
        db.Database.ExecuteSqlRaw("ALTER TABLE `StudentSubmissions` ADD UNIQUE INDEX `UX_StudentSubmissions_ActiveEmail` (`ActiveEmail`);");
    }

    // ---------------------------------------------------------------------
    // Stored procedures: EF's EnsureCreated() only builds tables, so a fresh
    // database has no procedures and every endpoint 500s. Load them from the
    // canonical script (idempotent) whenever any of the procedures the app
    // references is missing. This also re-syncs databases provisioned from an
    // older revision of the script (renamed/added procedures get recreated).
    // ---------------------------------------------------------------------
    var requiredProcedures = new[]
    {
        "sp_StudentSubmission_GetAll",
        "sp_SchoolBoard_ActiveExists",
        "sp_Session_ActiveExists",
        "sp_School_ActiveExists",
        "sp_FullConfig_DuplicateCheck",
        "sp_Lookup_Schools",
        "sp_Student_Approve",
        "sp_Users_UpdateProfilePicture",
        "sp_Users_UpdateUsername"
    };
    var placeholders = string.Join(",", requiredProcedures.Select((_, i) => $"@p{i}"));
    var missingCount = db.Database.SqlQueryRaw<int>(
        $"SELECT {requiredProcedures.Length} - COUNT(*) AS `Value` FROM information_schema.routines " +
        $"WHERE routine_schema = DATABASE() AND routine_type = 'PROCEDURE' AND routine_name IN ({placeholders})",
        requiredProcedures.Cast<object>().ToArray()
    ).AsEnumerable().Single();

    if (missingCount > 0)
    {
        var sqlScriptPath = Path.Combine(app.Environment.ContentRootPath, "Data", "full_database.sql");
        if (File.Exists(sqlScriptPath))
        {
            // MySqlConnector runs one command at a time by default, so each
            // CREATE PROCEDURE is sent as a single statement and the server
            // parses the BEGIN...END body (with its own semicolons) correctly.
            var loaderConn = new MySqlConnection(connectionString);
            loaderConn.Open();
            try
            {
                var script = File.ReadAllText(sqlScriptPath);
                foreach (var rawChunk in script.Split("$$", StringSplitOptions.None))
                {
                    // strip leading SQL comment lines (each chunk that starts a
                    // procedure also carries the banner comments above the DROP)
                    var lines = rawChunk.Split('\n')
                        .Where(line => !line.TrimStart().StartsWith("--", StringComparison.Ordinal))
                        .ToArray();
                    var statement = string.Join("\n", lines).Trim();
                    if (statement.Length == 0) continue;
                    if (statement.StartsWith("DROP PROCEDURE", StringComparison.OrdinalIgnoreCase) ||
                        statement.StartsWith("CREATE PROCEDURE", StringComparison.OrdinalIgnoreCase))
                    {
                        using var cmd = new MySqlCommand(statement, loaderConn);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            finally
            {
                loaderConn.Close();
            }

            Console.WriteLine($"Loaded stored procedures from {sqlScriptPath}.");
        }
        else
        {
            Console.WriteLine($"WARNING: {sqlScriptPath} not found. Stored procedures were not loaded; endpoints will 500 until the script is run manually.");
        }
    }
}

// local helper: create a foreign key only if it does not already exist
void AddForeignKeyIfMissing(AppDbContext db, string table, string name, string ddl)
{
    var exists = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) AS `Value` FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND constraint_name = {0}",
        name
    ).AsEnumerable().Single() > 0;

    if (!exists)
    {
        try
        {
            db.Database.ExecuteSqlRaw(ddl);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"WARNING: could not add constraint {name} on {table}: {ex.Message}");
        }
    }
}

// local helper: true when an index exists
bool HasIndex(AppDbContext db, string table, string name)
{
    return db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) AS `Value` FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = {0} AND index_name = {1}",
        table, name
    ).AsEnumerable().Single() > 0;
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

// rate-limit auth endpoints (annotated with [EnableRateLimiting])
app.UseRateLimiter();

// auth middleware
app.UseAuthentication();
app.UseAuthorization();

// map controllers
app.MapControllers();

// run
app.Run();

// generate a cryptographically-random password (no ambiguous characters)
string GenerateStrongPassword(int length)
{
    const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    var bytes = new byte[length];
    using var rng = RandomNumberGenerator.Create();
    rng.GetBytes(bytes);

    var chars = new char[length];
    for (var i = 0; i < length; i++)
    {
        chars[i] = alphabet[bytes[i] % alphabet.Length];
    }

    return new string(chars);
}
