-- ============================================================
-- Complete one-go script for GuestApi / Aadishri School ERP
-- Creates the database, all tables, all stored procedures,
-- and the default admin account.
-- ============================================================
-- NOTE on collation: utf8mb4_0900_ai_ci is used to match the
-- collation EF Core's EnsureCreated() creates for tables, so
-- stored-procedure parameters and table columns are consistent
-- (avoids the "Illegal mix of collations" login error).
-- ============================================================

DROP DATABASE IF EXISTS company_db;
CREATE DATABASE company_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE company_db;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    Id            INT AUTO_INCREMENT PRIMARY KEY,
    Username      VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255) NOT NULL,
    Role          VARCHAR(20) NOT NULL DEFAULT 'User',
    CreatedAt     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- SCHOOL BOARDS
-- ============================================================
CREATE TABLE SchoolBoards (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    UniversityName VARCHAR(150) NOT NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL
) ENGINE=InnoDB;

-- ============================================================
-- SESSIONS (standalone — no FK to Classes)
-- ============================================================
CREATE TABLE Sessions (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    Name           VARCHAR(150) NOT NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL,

    CONSTRAINT UX_Sessions_Name UNIQUE (Name)
) ENGINE=InnoDB;

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE Schools (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    SchoolBoardId  INT NOT NULL,
    Name           VARCHAR(150) NOT NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL,

    CONSTRAINT FK_Schools_SchoolBoards
        FOREIGN KEY (SchoolBoardId)
        REFERENCES SchoolBoards(Id)
        ON DELETE RESTRICT,

    CONSTRAINT UX_Schools_SchoolBoardId_Name
        UNIQUE (SchoolBoardId, Name)
) ENGINE=InnoDB;

-- ============================================================
-- CLASSES (nullable SessionId FK, ON DELETE SET NULL)
-- ============================================================
CREATE TABLE Classes (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    SchoolId       INT NULL,
    SessionId      INT NULL,
    Class          VARCHAR(150) NOT NULL,
    Section        VARCHAR(25) NOT NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL,

    CONSTRAINT FK_Classes_Schools
        FOREIGN KEY (SchoolId)
        REFERENCES Schools(Id)
        ON DELETE RESTRICT,

    CONSTRAINT FK_Classes_Sessions
        FOREIGN KEY (SessionId)
        REFERENCES Sessions(Id)
        ON DELETE SET NULL,

    CONSTRAINT UX_Classes_SchoolId_Class_Section
        UNIQUE (SchoolId, Class, Section)
) ENGINE=InnoDB;

-- ============================================================
-- STREAMS
-- ============================================================
CREATE TABLE Streams (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    ClassId        INT NOT NULL,
    Name           VARCHAR(150) NOT NULL,
    Acronym        VARCHAR(25) NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL,

    CONSTRAINT FK_Streams_Classes
        FOREIGN KEY (ClassId)
        REFERENCES Classes(Id)
        ON DELETE RESTRICT,

    CONSTRAINT UX_Streams_ClassId_Name
        UNIQUE (ClassId, Name)
) ENGINE=InnoDB;

-- ============================================================
-- SPECIALIZATIONS (optional StreamId links to Streams)
-- ============================================================
CREATE TABLE Specializations (
    Id             INT AUTO_INCREMENT PRIMARY KEY,
    ClassId        INT NOT NULL,
    StreamId       INT NULL,
    Name           VARCHAR(150) NOT NULL,
    IsActive       TINYINT(1) NOT NULL DEFAULT 1,
    InsertedBy     VARCHAR(100) NOT NULL,
    InsertedDate   DATETIME(6) NOT NULL,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME(6) NULL,
    DeletedBy      VARCHAR(100) NULL,
    DeletedDate    DATETIME(6) NULL,

    CONSTRAINT FK_Specializations_Classes
        FOREIGN KEY (ClassId)
        REFERENCES Classes(Id)
        ON DELETE RESTRICT,

    CONSTRAINT FK_Specializations_Streams
        FOREIGN KEY (StreamId)
        REFERENCES Streams(Id)
        ON DELETE SET NULL,

    CONSTRAINT UX_Specializations_ClassId_Name
        UNIQUE (ClassId, Name),
    INDEX IX_Specializations_StreamId (StreamId)
) ENGINE=InnoDB;

-- ============================================================
-- FULL CONFIGURATIONS (denormalised cache table)
-- ============================================================
CREATE TABLE FullConfigurations (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    BoardId         INT NOT NULL,
    BoardName       VARCHAR(150) NOT NULL,
    SessionId       INT NOT NULL,
    SessionName     VARCHAR(150) NOT NULL,
    SchoolId        INT NOT NULL,
    SchoolName      VARCHAR(150) NOT NULL,
    ClassId         INT NOT NULL,
    ClassName       VARCHAR(150) NOT NULL,
    ClassSection    VARCHAR(25) NOT NULL,
    CreatedBy       VARCHAR(100) NOT NULL,
    CreatedAt       DATETIME(6) NOT NULL,
    Specializations VARCHAR(1000) NULL,
    Streams         VARCHAR(1000) NULL,
    IsActive        TINYINT(1) NOT NULL DEFAULT 1,
    UpdatedBy       VARCHAR(100) NULL,
    UpdatedDate     DATETIME(6) NULL,
    DeletedBy       VARCHAR(100) NULL,
    DeletedDate     DATETIME(6) NULL
) ENGINE=InnoDB;

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE Students (
    Id               INT AUTO_INCREMENT PRIMARY KEY,
    FirstName        VARCHAR(100) NOT NULL,
    LastName         VARCHAR(100) NOT NULL,
    Gender           VARCHAR(10) NOT NULL,
    DateOfBirth      DATETIME(6) NOT NULL,
    Email            VARCHAR(150) NOT NULL,
    PhoneNumber      VARCHAR(20) NULL,
    Address          VARCHAR(200) NOT NULL,
    BloodGroup       VARCHAR(10) NULL,
    FatherName       VARCHAR(150) NOT NULL,
    MotherName       VARCHAR(150) NOT NULL,
    FatherPhone      VARCHAR(20) NOT NULL,
    MotherPhone      VARCHAR(20) NOT NULL,
    EmergencyContactName  VARCHAR(150) NULL,
    EmergencyContactPhone VARCHAR(20) NULL,
    AadhaarNumber    VARCHAR(20) NULL,
    Nationality      VARCHAR(50) NULL,
    Religion         VARCHAR(50) NULL,
    MotherTongue     VARCHAR(50) NULL,
    Category         VARCHAR(20) NULL,
    EnrollmentNumber VARCHAR(20) NULL,
    RollNumber       VARCHAR(20) NULL,
    BoardId          INT NOT NULL,
    SessionId        INT NOT NULL,
    SchoolId         INT NOT NULL,
    ClassId          INT NOT NULL,
    StreamId         INT NULL,
    SpecializationId INT NULL,
    IsActive         TINYINT(1) NOT NULL DEFAULT 1,
    Status           VARCHAR(20) NOT NULL DEFAULT 'Pending',
    ReviewNote       VARCHAR(500) NULL,
    ReviewedBy       VARCHAR(100) NULL,
    ReviewedDate     DATETIME(6) NULL,
    InsertedBy       VARCHAR(100) NOT NULL,
    UpdatedBy        VARCHAR(100) NULL,
    UpdatedDate      DATETIME(6) NULL,
    DeletedBy        VARCHAR(100) NULL,
    DeletedDate      DATETIME(6) NULL,
    CreatedAt        DATETIME(6) NOT NULL,

    CONSTRAINT UX_Students_Email UNIQUE (Email)
) ENGINE=InnoDB;
-- ============================================================
-- STORED PROCEDURES (all 80)
-- ============================================================
DELIMITER $$

-- ============================================================================
-- GuestApi — Stored Procedures (all database operations)
-- ----------------------------------------------------------------------------
-- WHAT:  Every data access operation the API performs is implemented here as a
--        MySQL stored procedure. The controllers never run ad-hoc SQL/EF LINQ;
--        they call these procedures through Dapper with
--        CommandType.StoredProcedure.
-- WHY:   Centralizes all SQL in one place, improves plan caching, and gives the
--        DBA a single file to review/optimize. Keeps the .NET side free of
--        string-split SQL.
-- HOW:   Run this script once against the database (MySQL Workbench or the mysql
--        CLI). It is idempotent: every procedure uses CREATE OR REPLACE, so it
--        can safely be re-run after schema changes.
-- NOTE:  The table DDL itself is still bootstrapped at app startup by Program.cs
--        (see the EnsureCreated + defensive ALTER block). This file only defines
--        the stored procedures that operate on those tables.
-- ============================================================================

-- ============================================================================
-- USERS (Auth)
-- ============================================================================

-- Get a single user by username (login / change-password).
DROP PROCEDURE IF EXISTS sp_Users_GetByUsername$$

CREATE PROCEDURE sp_Users_GetByUsername(IN pUsername VARCHAR(50))
BEGIN
    SELECT Id, Username, PasswordHash, Role, CreatedAt
    FROM users
    WHERE Username = pUsername
    LIMIT 1;
END$$

-- Returns 1 when the username is already taken (register).
DROP PROCEDURE IF EXISTS sp_Users_UsernameExists$$

CREATE PROCEDURE sp_Users_UsernameExists(IN pUsername VARCHAR(50))
BEGIN
    SELECT COUNT(*) FROM users WHERE Username = pUsername;
END$$

-- Inserts a new user and returns the freshly-created row (register).
DROP PROCEDURE IF EXISTS sp_Users_Create$$

CREATE PROCEDURE sp_Users_Create(
    IN pUsername VARCHAR(50),
    IN pPasswordHash VARCHAR(100),
    IN pRole VARCHAR(20)
)
BEGIN
    INSERT INTO users (Username, PasswordHash, Role, CreatedAt)
    VALUES (pUsername, pPasswordHash, pRole, UTC_TIMESTAMP(6));

    SELECT Id, Username, PasswordHash, Role, CreatedAt
    FROM users
    WHERE Id = LAST_INSERT_ID();
END$$

-- Replaces the stored BCrypt hash (change-password).
DROP PROCEDURE IF EXISTS sp_Users_UpdatePassword$$

CREATE PROCEDURE sp_Users_UpdatePassword(
    IN pUsername VARCHAR(50),
    IN pPasswordHash VARCHAR(100)
)
BEGIN
    UPDATE users SET PasswordHash = pPasswordHash WHERE Username = pUsername;
END$$

-- ============================================================================
-- SCHOOL BOARDS
-- ============================================================================

-- All active, non-deleted boards (ordered as the list endpoint expects).
DROP PROCEDURE IF EXISTS sp_SchoolBoard_GetAll$$

CREATE PROCEDURE sp_SchoolBoard_GetAll()
BEGIN
    SELECT Id, UniversityName, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM SchoolBoards
    WHERE IsActive = 1 AND DeletedDate IS NULL
    ORDER BY InsertedDate, Id;
END$$

-- Returns 1 when a live (non-deleted) board already uses pName.
DROP PROCEDURE IF EXISTS sp_SchoolBoard_NameExists$$

CREATE PROCEDURE sp_SchoolBoard_NameExists(
    IN pName VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM SchoolBoards
    WHERE UniversityName = pName
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- A single board by id regardless of deleted state (existence checks / delete).
DROP PROCEDURE IF EXISTS sp_SchoolBoard_GetById$$

CREATE PROCEDURE sp_SchoolBoard_GetById(IN pId INT)
BEGIN
    SELECT Id, UniversityName, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM SchoolBoards
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE schools referencing the board (delete referential guard).
DROP PROCEDURE IF EXISTS sp_SchoolBoards_ActiveSchoolsCount$$

CREATE PROCEDURE sp_SchoolBoards_ActiveSchoolsCount(IN pBoardId INT)
BEGIN
    SELECT COUNT(*)
    FROM Schools
    WHERE SchoolBoardId = pBoardId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a board and returns the created row.
DROP PROCEDURE IF EXISTS sp_SchoolBoard_Create$$

CREATE PROCEDURE sp_SchoolBoard_Create(
    IN pName VARCHAR(150),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO SchoolBoards (UniversityName, IsActive, InsertedBy, InsertedDate)
    VALUES (pName, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, UniversityName, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM SchoolBoards
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a board and returns the updated row.
DROP PROCEDURE IF EXISTS sp_SchoolBoard_Update$$

CREATE PROCEDURE sp_SchoolBoard_Update(
    IN pId INT,
    IN pName VARCHAR(150),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE SchoolBoards
    SET UniversityName = pName,
        IsActive       = pIsActive,
        UpdatedBy      = pUpdatedBy,
        UpdatedDate    = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, UniversityName, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM SchoolBoards
    WHERE Id = pId;
END$$

-- Soft-deletes a board (IsActive off + DeletedDate stamped).
DROP PROCEDURE IF EXISTS sp_SchoolBoard_Delete$$

CREATE PROCEDURE sp_SchoolBoard_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE SchoolBoards
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- SCHOOLS
-- ============================================================================

-- All active, non-deleted schools joined with their board name.
DROP PROCEDURE IF EXISTS sp_School_GetAll$$

CREATE PROCEDURE sp_School_GetAll()
BEGIN
    SELECT sch.Id, sch.SchoolBoardId, sch.Name, sch.IsActive,
           sch.InsertedBy, sch.InsertedDate,
           sch.UpdatedBy, sch.UpdatedDate, sch.DeletedBy, sch.DeletedDate,
           b.UniversityName AS SchoolBoardName
    FROM Schools sch
    INNER JOIN SchoolBoards b ON b.Id = sch.SchoolBoardId
    WHERE sch.IsActive = 1 AND sch.DeletedDate IS NULL
    ORDER BY sch.InsertedDate, sch.Id;
END$$

-- Returns 1 when the board exists, is active and not deleted.
DROP PROCEDURE IF EXISTS sp_School_BoardExists$$

CREATE PROCEDURE sp_School_BoardExists(IN pBoardId INT)
BEGIN
    SELECT COUNT(*)
    FROM SchoolBoards
    WHERE Id = pBoardId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Returns 1 when a live school already exists for the (board, name) pair.
DROP PROCEDURE IF EXISTS sp_School_Exists$$

CREATE PROCEDURE sp_School_Exists(
    IN pBoardId INT,
    IN pName VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Schools
    WHERE SchoolBoardId = pBoardId
      AND Name = pName
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- A single school by id (existence checks).
DROP PROCEDURE IF EXISTS sp_School_GetById$$

CREATE PROCEDURE sp_School_GetById(IN pId INT)
BEGIN
    SELECT Id, SchoolBoardId, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Schools
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE classes referencing the school (delete referential guard).
DROP PROCEDURE IF EXISTS sp_Schools_ActiveClassesCount$$

CREATE PROCEDURE sp_Schools_ActiveClassesCount(IN pSchoolId INT)
BEGIN
    SELECT COUNT(*)
    FROM Classes
    WHERE SchoolId = pSchoolId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a school and returns the created row.
DROP PROCEDURE IF EXISTS sp_School_Create$$

CREATE PROCEDURE sp_School_Create(
    IN pSchoolBoardId INT,
    IN pName VARCHAR(150),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Schools (SchoolBoardId, Name, IsActive, InsertedBy, InsertedDate)
    VALUES (pSchoolBoardId, pName, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, SchoolBoardId, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Schools
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a school and returns the updated row.
DROP PROCEDURE IF EXISTS sp_School_Update$$

CREATE PROCEDURE sp_School_Update(
    IN pId INT,
    IN pSchoolBoardId INT,
    IN pName VARCHAR(150),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Schools
    SET SchoolBoardId = pSchoolBoardId,
        Name          = pName,
        IsActive      = pIsActive,
        UpdatedBy     = pUpdatedBy,
        UpdatedDate   = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, SchoolBoardId, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Schools
    WHERE Id = pId;
END$$

-- Soft-deletes a school.
DROP PROCEDURE IF EXISTS sp_School_Delete$$

CREATE PROCEDURE sp_School_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Schools
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- CLASSES
-- ============================================================================

-- All active, non-deleted classes joined with school + session names (LEFT).
DROP PROCEDURE IF EXISTS sp_Class_GetAll$$

CREATE PROCEDURE sp_Class_GetAll()
BEGIN
    SELECT c.Id, c.SchoolId, c.SessionId, c.`Class` AS Name, c.Section,
           c.IsActive, c.InsertedBy, c.InsertedDate,
           c.UpdatedBy, c.UpdatedDate, c.DeletedBy, c.DeletedDate,
           sch.Name AS SchoolName,
           ses.Name AS SessionName
    FROM Classes c
    LEFT JOIN Schools sch ON sch.Id = c.SchoolId
    LEFT JOIN Sessions ses ON ses.Id = c.SessionId
    WHERE c.IsActive = 1 AND c.DeletedDate IS NULL
    ORDER BY c.Id;
END$$

-- Returns 1 when the school exists, is active and not deleted.
DROP PROCEDURE IF EXISTS sp_Class_SchoolExists$$

CREATE PROCEDURE sp_Class_SchoolExists(IN pSchoolId INT)
BEGIN
    SELECT COUNT(*)
    FROM Schools
    WHERE Id = pSchoolId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Returns 1 when a live class already exists for (school, name, section).
DROP PROCEDURE IF EXISTS sp_Class_Exists$$

CREATE PROCEDURE sp_Class_Exists(
    IN pSchoolId INT,
    IN pName VARCHAR(150),
    IN pSection VARCHAR(25),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Classes
    WHERE SchoolId = pSchoolId
      AND `Class` = pName
      AND Section = pSection
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- The active class name by id (used to enforce the XI/XII specialization rule).
DROP PROCEDURE IF EXISTS sp_Class_GetNameById$$

CREATE PROCEDURE sp_Class_GetNameById(IN pId INT)
BEGIN
    SELECT `Class` AS Name
    FROM Classes
    WHERE Id = pId AND IsActive = 1 AND DeletedDate IS NULL
    LIMIT 1;
END$$

-- A single class by id (existence checks).
DROP PROCEDURE IF EXISTS sp_Class_GetById$$

CREATE PROCEDURE sp_Class_GetById(IN pId INT)
BEGIN
    SELECT Id, SchoolId, SessionId, `Class` AS Name, Section, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Classes
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE streams referencing the class (delete guard).
DROP PROCEDURE IF EXISTS sp_Classes_ActiveStreamsCount$$

CREATE PROCEDURE sp_Classes_ActiveStreamsCount(IN pClassId INT)
BEGIN
    SELECT COUNT(*) FROM Streams WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Number of ACTIVE specializations referencing the class (delete guard).
DROP PROCEDURE IF EXISTS sp_Classes_ActiveSpecializationsCount$$

CREATE PROCEDURE sp_Classes_ActiveSpecializationsCount(IN pClassId INT)
BEGIN
    SELECT COUNT(*) FROM Specializations WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Number of ACTIVE students referencing the class (delete guard).
DROP PROCEDURE IF EXISTS sp_Classes_ActiveStudentsCount$$

CREATE PROCEDURE sp_Classes_ActiveStudentsCount(IN pClassId INT)
BEGIN
    SELECT COUNT(*) FROM Students WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a class and returns the created row.
DROP PROCEDURE IF EXISTS sp_Class_Create$$

CREATE PROCEDURE sp_Class_Create(
    IN pSchoolId INT,
    IN pSessionId INT,
    IN pName VARCHAR(150),
    IN pSection VARCHAR(25),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Classes (SchoolId, SessionId, `Class`, Section, IsActive, InsertedBy, InsertedDate)
    VALUES (pSchoolId, pSessionId, pName, pSection, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, SchoolId, SessionId, `Class` AS Name, Section, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Classes
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a class and returns the updated row.
DROP PROCEDURE IF EXISTS sp_Class_Update$$

CREATE PROCEDURE sp_Class_Update(
    IN pId INT,
    IN pSchoolId INT,
    IN pSessionId INT,
    IN pName VARCHAR(150),
    IN pSection VARCHAR(25),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Classes
    SET SchoolId  = pSchoolId,
        SessionId = pSessionId,
        `Class`   = pName,
        Section   = pSection,
        IsActive  = pIsActive,
        UpdatedBy = pUpdatedBy,
        UpdatedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, SchoolId, SessionId, `Class` AS Name, Section, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Classes
    WHERE Id = pId;
END$$

-- Soft-deletes a class.
DROP PROCEDURE IF EXISTS sp_Class_Delete$$

CREATE PROCEDURE sp_Class_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Classes
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- SESSIONS
-- ============================================================================

-- All active, non-deleted sessions, newest first.
DROP PROCEDURE IF EXISTS sp_Session_GetAll$$

CREATE PROCEDURE sp_Session_GetAll()
BEGIN
    SELECT Id, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Sessions
    WHERE IsActive = 1 AND DeletedDate IS NULL
    ORDER BY Id DESC;
END$$

-- Returns 1 when a live session already uses pName.
DROP PROCEDURE IF EXISTS sp_Session_NameExists$$

CREATE PROCEDURE sp_Session_NameExists(
    IN pName VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Sessions
    WHERE Name = pName
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- A single session by id.
DROP PROCEDURE IF EXISTS sp_Session_GetById$$

CREATE PROCEDURE sp_Session_GetById(IN pId INT)
BEGIN
    SELECT Id, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Sessions
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE classes referencing the session (delete guard).
DROP PROCEDURE IF EXISTS sp_Sessions_ActiveClassesCount$$

CREATE PROCEDURE sp_Sessions_ActiveClassesCount(IN pSessionId INT)
BEGIN
    SELECT COUNT(*) FROM Classes WHERE SessionId = pSessionId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Number of ACTIVE students referencing the session (delete guard).
DROP PROCEDURE IF EXISTS sp_Sessions_ActiveStudentsCount$$

CREATE PROCEDURE sp_Sessions_ActiveStudentsCount(IN pSessionId INT)
BEGIN
    SELECT COUNT(*) FROM Students WHERE SessionId = pSessionId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a session and returns the created row.
DROP PROCEDURE IF EXISTS sp_Session_Create$$

CREATE PROCEDURE sp_Session_Create(
    IN pName VARCHAR(150),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Sessions (Name, IsActive, InsertedBy, InsertedDate)
    VALUES (pName, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Sessions
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a session and returns the updated row.
DROP PROCEDURE IF EXISTS sp_Session_Update$$

CREATE PROCEDURE sp_Session_Update(
    IN pId INT,
    IN pName VARCHAR(150),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Sessions
    SET Name        = pName,
        IsActive    = pIsActive,
        UpdatedBy   = pUpdatedBy,
        UpdatedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, Name, IsActive, InsertedBy, InsertedDate,
           UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Sessions
    WHERE Id = pId;
END$$

-- Soft-deletes a session.
DROP PROCEDURE IF EXISTS sp_Session_Delete$$

CREATE PROCEDURE sp_Session_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Sessions
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- STREAMS
-- ============================================================================

-- All active, non-deleted streams joined with class + school names.
DROP PROCEDURE IF EXISTS sp_Stream_GetAll$$

CREATE PROCEDURE sp_Stream_GetAll()
BEGIN
    SELECT st.Id, st.ClassId, st.Name, st.Acronym, st.IsActive,
           st.InsertedBy, st.InsertedDate,
           st.UpdatedBy, st.UpdatedDate, st.DeletedBy, st.DeletedDate,
           c.`Class` AS ClassName,
           c.Section AS ClassSection,
           sch.Name AS SchoolName
    FROM Streams st
    INNER JOIN Classes c ON c.Id = st.ClassId
    LEFT JOIN Schools sch ON sch.Id = c.SchoolId
    WHERE st.IsActive = 1 AND st.DeletedDate IS NULL
    ORDER BY st.Id;
END$$

-- Returns 1 when the class exists, is active and not deleted.
DROP PROCEDURE IF EXISTS sp_Stream_ClassExists$$

CREATE PROCEDURE sp_Stream_ClassExists(IN pClassId INT)
BEGIN
    SELECT COUNT(*)
    FROM Classes
    WHERE Id = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Returns 1 when a live stream already exists for (class, name).
DROP PROCEDURE IF EXISTS sp_Stream_Exists$$

CREATE PROCEDURE sp_Stream_Exists(
    IN pClassId INT,
    IN pName VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Streams
    WHERE ClassId = pClassId
      AND Name = pName
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- A single stream by id.
DROP PROCEDURE IF EXISTS sp_Stream_GetById$$

CREATE PROCEDURE sp_Stream_GetById(IN pId INT)
BEGIN
    SELECT Id, ClassId, Name, Acronym, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Streams
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE students referencing the stream (delete guard).
DROP PROCEDURE IF EXISTS sp_Streams_ActiveStudentsCount$$

CREATE PROCEDURE sp_Streams_ActiveStudentsCount(IN pStreamId INT)
BEGIN
    SELECT COUNT(*) FROM Students WHERE StreamId = pStreamId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a stream and returns the created row.
DROP PROCEDURE IF EXISTS sp_Stream_Create$$

CREATE PROCEDURE sp_Stream_Create(
    IN pClassId INT,
    IN pName VARCHAR(150),
    IN pAcronym VARCHAR(25),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Streams (ClassId, Name, Acronym, IsActive, InsertedBy, InsertedDate)
    VALUES (pClassId, pName, pAcronym, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, ClassId, Name, Acronym, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Streams
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a stream and returns the updated row.
DROP PROCEDURE IF EXISTS sp_Stream_Update$$

CREATE PROCEDURE sp_Stream_Update(
    IN pId INT,
    IN pClassId INT,
    IN pName VARCHAR(150),
    IN pAcronym VARCHAR(25),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Streams
    SET ClassId    = pClassId,
        Name       = pName,
        Acronym    = pAcronym,
        IsActive   = pIsActive,
        UpdatedBy  = pUpdatedBy,
        UpdatedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, ClassId, Name, Acronym, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Streams
    WHERE Id = pId;
END$$

-- Soft-deletes a stream.
DROP PROCEDURE IF EXISTS sp_Stream_Delete$$

CREATE PROCEDURE sp_Stream_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Streams
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- SPECIALIZATIONS
-- ============================================================================

-- All active, non-deleted specializations joined with class/school/stream names.
DROP PROCEDURE IF EXISTS sp_Specialization_GetAll$$

CREATE PROCEDURE sp_Specialization_GetAll()
BEGIN
    SELECT sp.Id, sp.ClassId, sp.StreamId, sp.Name, sp.IsActive,
           sp.InsertedBy, sp.InsertedDate,
           sp.UpdatedBy, sp.UpdatedDate, sp.DeletedBy, sp.DeletedDate,
           c.`Class` AS ClassName,
           c.Section AS ClassSection,
           sch.Name AS SchoolName,
           st.Name AS StreamName,
           st.Acronym AS StreamAcronym
    FROM Specializations sp
    INNER JOIN Classes c ON c.Id = sp.ClassId
    LEFT JOIN Schools sch ON sch.Id = c.SchoolId
    LEFT JOIN Streams st ON st.Id = sp.StreamId
    WHERE sp.IsActive = 1 AND sp.DeletedDate IS NULL
    ORDER BY sp.Id;
END$$

-- Returns 1 when the class is active and its name is XI or XII (eligibility rule).
DROP PROCEDURE IF EXISTS sp_Specialization_IsEligibleClass$$

CREATE PROCEDURE sp_Specialization_IsEligibleClass(IN pClassId INT)
BEGIN
    SELECT COUNT(*)
    FROM Classes
    WHERE Id = pClassId
      AND IsActive = 1
      AND DeletedDate IS NULL
      AND (UPPER(`Class`) = 'XI' OR UPPER(`Class`) = 'XII');
END$$

-- Returns 1 when the stream belongs to the given class (consistency rule).
DROP PROCEDURE IF EXISTS sp_Specialization_StreamBelongsToClass$$

CREATE PROCEDURE sp_Specialization_StreamBelongsToClass(
    IN pClassId INT,
    IN pStreamId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Streams
    WHERE Id = pStreamId AND ClassId = pClassId AND IsActive = 1;
END$$

-- Returns 1 when a live specialization already exists for (class, name).
DROP PROCEDURE IF EXISTS sp_Specialization_Exists$$

CREATE PROCEDURE sp_Specialization_Exists(
    IN pClassId INT,
    IN pName VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Specializations
    WHERE ClassId = pClassId
      AND Name = pName
      AND DeletedDate IS NULL
      AND (pExcludeId IS NULL OR Id <> pExcludeId);
END$$

-- A single specialization by id.
DROP PROCEDURE IF EXISTS sp_Specialization_GetById$$

CREATE PROCEDURE sp_Specialization_GetById(IN pId INT)
BEGIN
    SELECT Id, ClassId, StreamId, Name, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Specializations
    WHERE Id = pId
    LIMIT 1;
END$$

-- Number of ACTIVE students referencing the specialization (delete guard).
DROP PROCEDURE IF EXISTS sp_Specializations_ActiveStudentsCount$$

CREATE PROCEDURE sp_Specializations_ActiveStudentsCount(IN pSpecializationId INT)
BEGIN
    SELECT COUNT(*)
    FROM Students
    WHERE SpecializationId = pSpecializationId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Inserts a specialization and returns the created row.
DROP PROCEDURE IF EXISTS sp_Specialization_Create$$

CREATE PROCEDURE sp_Specialization_Create(
    IN pClassId INT,
    IN pStreamId INT,
    IN pName VARCHAR(150),
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Specializations (ClassId, StreamId, Name, IsActive, InsertedBy, InsertedDate)
    VALUES (pClassId, pStreamId, pName, 1, pInsertedBy, UTC_TIMESTAMP(6));

    SELECT Id, ClassId, StreamId, Name, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Specializations
    WHERE Id = LAST_INSERT_ID();
END$$

-- Updates a specialization and returns the updated row.
DROP PROCEDURE IF EXISTS sp_Specialization_Update$$

CREATE PROCEDURE sp_Specialization_Update(
    IN pId INT,
    IN pClassId INT,
    IN pStreamId INT,
    IN pName VARCHAR(150),
    IN pIsActive TINYINT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Specializations
    SET ClassId    = pClassId,
        StreamId   = pStreamId,
        Name       = pName,
        IsActive   = pIsActive,
        UpdatedBy  = pUpdatedBy,
        UpdatedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT Id, ClassId, StreamId, Name, IsActive,
           InsertedBy, InsertedDate, UpdatedBy, UpdatedDate, DeletedBy, DeletedDate
    FROM Specializations
    WHERE Id = pId;
END$$

-- Soft-deletes a specialization.
DROP PROCEDURE IF EXISTS sp_Specialization_Delete$$

CREATE PROCEDURE sp_Specialization_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Specializations
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- ============================================================================
-- LOOKUPS (shared by the Student submission form + Full Configuration wizard)
-- ============================================================================

-- Active boards as { Id, Name } options, alphabetical.
DROP PROCEDURE IF EXISTS sp_Lookup_Boards$$

CREATE PROCEDURE sp_Lookup_Boards()
BEGIN
    SELECT Id, UniversityName AS Name
    FROM SchoolBoards
    WHERE IsActive = 1 AND DeletedDate IS NULL
    ORDER BY UniversityName;
END$$

-- Active sessions as { Id, Name } options, alphabetical.
DROP PROCEDURE IF EXISTS sp_Lookup_Sessions$$

CREATE PROCEDURE sp_Lookup_Sessions()
BEGIN
    SELECT Id, Name
    FROM Sessions
    WHERE IsActive = 1 AND DeletedDate IS NULL
    ORDER BY Name;
END$$

-- Active schools of a board as { Id, Name } options, alphabetical.
DROP PROCEDURE IF EXISTS sp_Lookup_Schools$$

CREATE PROCEDURE sp_Lookup_Schools(IN pBoardId INT)
BEGIN
    SELECT Id, Name
    FROM Schools
    WHERE SchoolBoardId = pBoardId AND IsActive = 1 AND DeletedDate IS NULL
    ORDER BY Name;
END$$

-- Active classes of a school (optionally filtered by session) as options.
DROP PROCEDURE IF EXISTS sp_Lookup_Classes$$

CREATE PROCEDURE sp_Lookup_Classes(
    IN pSchoolId INT,
    IN pSessionId INT
)
BEGIN
    SELECT Id, `Class` AS Name, Section AS Subtitle
    FROM Classes
    WHERE SchoolId = pSchoolId
      AND IsActive = 1
      AND DeletedDate IS NULL
      AND (pSessionId IS NULL OR SessionId = pSessionId)
    ORDER BY `Class`, Section;
END$$

-- Active streams of a class as options (acronym as subtitle).
DROP PROCEDURE IF EXISTS sp_Lookup_Streams$$

CREATE PROCEDURE sp_Lookup_Streams(IN pClassId INT)
BEGIN
    SELECT Id, Name, Acronym AS Subtitle
    FROM Streams
    WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL
    ORDER BY Name;
END$$

-- Active specializations of a class as options.
DROP PROCEDURE IF EXISTS sp_Lookup_Specializations$$

CREATE PROCEDURE sp_Lookup_Specializations(IN pClassId INT)
BEGIN
    SELECT Id, Name
    FROM Specializations
    WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL
    ORDER BY Name;
END$$

-- ============================================================================
-- STUDENTS
-- ============================================================================

-- All students (optionally including inactive), newest first, joined with names.
DROP PROCEDURE IF EXISTS sp_Student_GetAll$$

CREATE PROCEDURE sp_Student_GetAll(IN pIncludeInactive TINYINT)
BEGIN
    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE (pIncludeInactive = 1 OR s.IsActive = 1)
    ORDER BY s.CreatedAt DESC;
END$$

-- A single student by id with joined names.
DROP PROCEDURE IF EXISTS sp_Student_GetById$$

CREATE PROCEDURE sp_Student_GetById(IN pId INT)
BEGIN
    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.Id = pId
    LIMIT 1;
END$$

-- Active students personally submitted by pUsername, newest first, joined names.
DROP PROCEDURE IF EXISTS sp_Student_GetMy$$

CREATE PROCEDURE sp_Student_GetMy(IN pUsername VARCHAR(100))
BEGIN
    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.InsertedBy = pUsername AND s.IsActive = 1
    ORDER BY s.CreatedAt DESC;
END$$

-- Returns 1 when the user already has an active student entry (one-per-user rule).
DROP PROCEDURE IF EXISTS sp_Students_UserHasActiveEntry$$

CREATE PROCEDURE sp_Students_UserHasActiveEntry(IN pUsername VARCHAR(100))
BEGIN
    SELECT COUNT(*) FROM Students WHERE InsertedBy = pUsername AND IsActive = 1;
END$$

-- Returns 1 when the email is used by a non-deleted student.
DROP PROCEDURE IF EXISTS sp_Students_EmailExists$$

CREATE PROCEDURE sp_Students_EmailExists(IN pEmail VARCHAR(150))
BEGIN
    SELECT COUNT(*) FROM Students WHERE Email = pEmail AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Returns 1 when the email is used by a non-deleted student other than pExcludeId.
DROP PROCEDURE IF EXISTS sp_Students_EmailExistsExclude$$

CREATE PROCEDURE sp_Students_EmailExistsExclude(
    IN pEmail VARCHAR(150),
    IN pExcludeId INT
)
BEGIN
    SELECT COUNT(*) FROM Students WHERE Email = pEmail AND IsActive = 1 AND DeletedDate IS NULL AND Id <> pExcludeId;
END$$

-- Inserts a student and returns the created row with joined names.
DROP PROCEDURE IF EXISTS sp_Student_Create$$

CREATE PROCEDURE sp_Student_Create(
    IN pFirstName VARCHAR(100), IN pLastName VARCHAR(100), IN pGender VARCHAR(10),
    IN pDateOfBirth DATETIME, IN pEmail VARCHAR(150), IN pPhoneNumber VARCHAR(20),
    IN pAddress VARCHAR(200), IN pBloodGroup VARCHAR(10),
    IN pFatherName VARCHAR(150), IN pMotherName VARCHAR(150),
    IN pFatherPhone VARCHAR(20), IN pMotherPhone VARCHAR(20),
    IN pEmergencyContactName VARCHAR(150), IN pEmergencyContactPhone VARCHAR(20),
    IN pAadhaarNumber VARCHAR(20), IN pNationality VARCHAR(50),
    IN pReligion VARCHAR(50), IN pMotherTongue VARCHAR(50),
    IN pCategory VARCHAR(20), IN pEnrollmentNumber VARCHAR(20),
    IN pRollNumber VARCHAR(20), IN pBoardId INT, IN pSessionId INT,
    IN pSchoolId INT, IN pClassId INT, IN pStreamId INT, IN pSpecializationId INT,
    IN pInsertedBy VARCHAR(100)
)
BEGIN
    INSERT INTO Students (
        FirstName, LastName, Gender, DateOfBirth, Email, PhoneNumber, Address,
        BloodGroup, FatherName, MotherName, FatherPhone, MotherPhone,
        EmergencyContactName, EmergencyContactPhone, AadhaarNumber, Nationality,
        Religion, MotherTongue, Category, EnrollmentNumber, RollNumber,
        BoardId, SessionId, SchoolId, ClassId, StreamId, SpecializationId,
        IsActive, Status, InsertedBy, CreatedAt
    ) VALUES (
        pFirstName, pLastName, pGender, pDateOfBirth, pEmail, pPhoneNumber, pAddress,
        pBloodGroup, pFatherName, pMotherName, pFatherPhone, pMotherPhone,
        pEmergencyContactName, pEmergencyContactPhone, pAadhaarNumber, pNationality,
        pReligion, pMotherTongue, pCategory, pEnrollmentNumber, pRollNumber,
        pBoardId, pSessionId, pSchoolId, pClassId, pStreamId, pSpecializationId,
        1, 'Pending', pInsertedBy, UTC_TIMESTAMP(6)
    );

    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.Id = LAST_INSERT_ID();
END$$

-- Updates a student and returns the updated row with joined names.
DROP PROCEDURE IF EXISTS sp_Student_Update$$

CREATE PROCEDURE sp_Student_Update(
    IN pId INT,
    IN pFirstName VARCHAR(100), IN pLastName VARCHAR(100), IN pGender VARCHAR(10),
    IN pDateOfBirth DATETIME, IN pEmail VARCHAR(150), IN pPhoneNumber VARCHAR(20),
    IN pAddress VARCHAR(200), IN pBloodGroup VARCHAR(10),
    IN pFatherName VARCHAR(150), IN pMotherName VARCHAR(150),
    IN pFatherPhone VARCHAR(20), IN pMotherPhone VARCHAR(20),
    IN pEmergencyContactName VARCHAR(150), IN pEmergencyContactPhone VARCHAR(20),
    IN pAadhaarNumber VARCHAR(20), IN pNationality VARCHAR(50),
    IN pReligion VARCHAR(50), IN pMotherTongue VARCHAR(50),
    IN pCategory VARCHAR(20), IN pEnrollmentNumber VARCHAR(20),
    IN pRollNumber VARCHAR(20), IN pBoardId INT, IN pSessionId INT,
    IN pSchoolId INT, IN pClassId INT, IN pStreamId INT, IN pSpecializationId INT,
    IN pUpdatedBy VARCHAR(100)
)
BEGIN
    UPDATE Students
    SET FirstName = pFirstName, LastName = pLastName, Gender = pGender,
        DateOfBirth = pDateOfBirth, Email = pEmail, PhoneNumber = pPhoneNumber,
        Address = pAddress, BloodGroup = pBloodGroup,
        FatherName = pFatherName, MotherName = pMotherName,
        FatherPhone = pFatherPhone, MotherPhone = pMotherPhone,
        EmergencyContactName = pEmergencyContactName,
        EmergencyContactPhone = pEmergencyContactPhone,
        AadhaarNumber = pAadhaarNumber, Nationality = pNationality,
        Religion = pReligion, MotherTongue = pMotherTongue,
        Category = pCategory, EnrollmentNumber = pEnrollmentNumber,
        RollNumber = pRollNumber, BoardId = pBoardId, SessionId = pSessionId,
        SchoolId = pSchoolId, ClassId = pClassId, StreamId = pStreamId,
        SpecializationId = pSpecializationId,
        Status = 'Pending', ReviewNote = NULL, ReviewedBy = NULL, ReviewedDate = NULL,
        UpdatedBy = pUpdatedBy, UpdatedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.Id = pId;
END$$

-- Soft-deletes a student.
DROP PROCEDURE IF EXISTS sp_Student_Delete$$

CREATE PROCEDURE sp_Student_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE Students
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

-- Approves a student submission and returns the updated row with joined names.
DROP PROCEDURE IF EXISTS sp_Student_Approve$$

CREATE PROCEDURE sp_Student_Approve(
    IN pId INT,
    IN pReviewedBy VARCHAR(100)
)
BEGIN
    UPDATE Students
    SET Status = 'Approved',
        IsActive = 1,
        ReviewNote = NULL,
        ReviewedBy = pReviewedBy,
        ReviewedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.Id = pId;
END$$

-- Rejects a student submission (optional note) and returns the updated row.
DROP PROCEDURE IF EXISTS sp_Student_Reject$$

CREATE PROCEDURE sp_Student_Reject(
    IN pId INT,
    IN pReviewedBy VARCHAR(100),
    IN pReviewNote VARCHAR(500)
)
BEGIN
    UPDATE Students
    SET Status = 'Rejected',
        IsActive = 1,
        ReviewNote = pReviewNote,
        ReviewedBy = pReviewedBy,
        ReviewedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;

    SELECT s.Id, s.FirstName, s.LastName, s.Gender, s.DateOfBirth, s.Email,
           s.PhoneNumber, s.Address, s.BloodGroup, s.FatherName, s.MotherName,
           s.FatherPhone, s.MotherPhone, s.EmergencyContactName,
           s.EmergencyContactPhone, s.AadhaarNumber, s.Nationality, s.Religion,
           s.MotherTongue, s.Category, s.EnrollmentNumber, s.RollNumber,
           s.BoardId, b.UniversityName AS BoardName,
           s.SessionId, ses.Name AS SessionName,
           s.SchoolId, sch.Name AS SchoolName,
           s.ClassId, c.`Class` AS ClassName, c.Section AS ClassSection,
           s.StreamId, st.Name AS StreamName,
           s.SpecializationId, sp.Name AS SpecializationName,
           s.IsActive, s.Status, s.ReviewNote, s.ReviewedBy, s.ReviewedDate,
           s.InsertedBy, s.UpdatedBy, s.UpdatedDate, s.DeletedDate,
           s.CreatedAt
    FROM Students s
    LEFT JOIN SchoolBoards b ON b.Id = s.BoardId
    LEFT JOIN Sessions ses ON ses.Id = s.SessionId
    LEFT JOIN Schools sch ON sch.Id = s.SchoolId
    LEFT JOIN Classes c ON c.Id = s.ClassId
    LEFT JOIN Streams st ON st.Id = s.StreamId
    LEFT JOIN Specializations sp ON sp.Id = s.SpecializationId
    WHERE s.Id = pId;
END$$

-- ============================================================================
-- SHARED HELPERS (cascade validation + configuration snapshots)
-- ============================================================================

-- Returns 1 when a session exists, is active and not deleted.
DROP PROCEDURE IF EXISTS sp_Session_ActiveExists$$

CREATE PROCEDURE sp_Session_ActiveExists(IN pId INT)
BEGIN
    SELECT COUNT(*) FROM Sessions WHERE Id = pId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Returns 1 when a school exists, is active and not deleted.
DROP PROCEDURE IF EXISTS sp_School_ActiveExists$$

CREATE PROCEDURE sp_School_ActiveExists(IN pId INT)
BEGIN
    SELECT COUNT(*) FROM Schools WHERE Id = pId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Comma-joined names of a class's active streams (configuration snapshot).
DROP PROCEDURE IF EXISTS sp_Streams_ConcatByClass$$

CREATE PROCEDURE sp_Streams_ConcatByClass(IN pClassId INT)
BEGIN
    SELECT COALESCE(GROUP_CONCAT(Name ORDER BY Name SEPARATOR ', '), '')
    FROM Streams WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- Comma-joined names of a class's active specializations (configuration snapshot).
DROP PROCEDURE IF EXISTS sp_Specializations_ConcatByClass$$

CREATE PROCEDURE sp_Specializations_ConcatByClass(IN pClassId INT)
BEGIN
    SELECT COALESCE(GROUP_CONCAT(Name ORDER BY Name SEPARATOR ', '), '')
    FROM Specializations WHERE ClassId = pClassId AND IsActive = 1 AND DeletedDate IS NULL;
END$$

-- ============================================================================
-- FULL CONFIGURATIONS
-- ============================================================================

-- Returns 1 when the (board, session, school, class) combination is already saved.
DROP PROCEDURE IF EXISTS sp_FullConfig_DuplicateCheck$$

CREATE PROCEDURE sp_FullConfig_DuplicateCheck(
    IN pBoardId INT, IN pSessionId INT, IN pSchoolId INT, IN pClassId INT,
    IN pExcludeId INT DEFAULT 0
)
BEGIN
    SELECT COUNT(*)
    FROM FullConfigurations
    WHERE IsActive = 1
      AND DeletedDate IS NULL
      AND BoardId = pBoardId
      AND SessionId = pSessionId
      AND SchoolId = pSchoolId
      AND ClassId = pClassId
      AND Id <> pExcludeId;
END$$

-- Active saved configurations (newest first) with live streams/specializations.
DROP PROCEDURE IF EXISTS sp_FullConfig_GetSaved$$

CREATE PROCEDURE sp_FullConfig_GetSaved()
BEGIN
    SELECT fc.Id, fc.BoardId, fc.BoardName, fc.SessionId, fc.SessionName,
           fc.SchoolId, fc.SchoolName, fc.ClassId, fc.ClassName, fc.ClassSection,
           COALESCE((
               SELECT GROUP_CONCAT(st.Name ORDER BY st.Name SEPARATOR ', ')
               FROM Streams st
               WHERE st.ClassId = fc.ClassId AND st.IsActive = 1 AND st.DeletedDate IS NULL
           ), '') AS Streams,
           COALESCE((
               SELECT GROUP_CONCAT(sp.Name ORDER BY sp.Name SEPARATOR ', ')
               FROM Specializations sp
               WHERE sp.ClassId = fc.ClassId AND sp.IsActive = 1 AND sp.DeletedDate IS NULL
           ), '') AS Specializations
    FROM FullConfigurations fc
    WHERE fc.IsActive = 1 AND fc.DeletedDate IS NULL
    ORDER BY fc.CreatedAt DESC;
END$$

-- A single active configuration by id.
DROP PROCEDURE IF EXISTS sp_FullConfig_GetById$$

CREATE PROCEDURE sp_FullConfig_GetById(IN pId INT)
BEGIN
    SELECT Id, BoardId, BoardName, SessionId, SessionName, SchoolId, SchoolName,
           ClassId, ClassName, ClassSection, CreatedBy, CreatedAt,
           Specializations, Streams, IsActive, DeletedBy, DeletedDate,
           UpdatedBy, UpdatedDate
    FROM FullConfigurations
    WHERE Id = pId AND IsActive = 1 AND DeletedDate IS NULL
    LIMIT 1;
END$$

-- Inserts a configuration snapshot and returns the created row with live data.
DROP PROCEDURE IF EXISTS sp_FullConfig_Create$$

CREATE PROCEDURE sp_FullConfig_Create(
    IN pBoardId INT, IN pBoardName VARCHAR(150),
    IN pSessionId INT, IN pSessionName VARCHAR(150),
    IN pSchoolId INT, IN pSchoolName VARCHAR(150),
    IN pClassId INT, IN pClassName VARCHAR(150), IN pClassSection VARCHAR(25),
    IN pCreatedBy VARCHAR(100),
    IN pStreams VARCHAR(1000), IN pSpecializations VARCHAR(1000)
)
BEGIN
    INSERT INTO FullConfigurations (
        BoardId, BoardName, SessionId, SessionName, SchoolId, SchoolName,
        ClassId, ClassName, ClassSection, CreatedBy, CreatedAt,
        Specializations, Streams, IsActive
    ) VALUES (
        pBoardId, pBoardName, pSessionId, pSessionName, pSchoolId, pSchoolName,
        pClassId, pClassName, pClassSection, pCreatedBy, UTC_TIMESTAMP(6),
        pSpecializations, pStreams, 1
    );

    SELECT fc.Id, fc.BoardId, fc.BoardName, fc.SessionId, fc.SessionName,
           fc.SchoolId, fc.SchoolName, fc.ClassId, fc.ClassName, fc.ClassSection,
           COALESCE((
               SELECT GROUP_CONCAT(st.Name ORDER BY st.Name SEPARATOR ', ')
               FROM Streams st
               WHERE st.ClassId = fc.ClassId AND st.IsActive = 1 AND st.DeletedDate IS NULL
           ), '') AS Streams,
           COALESCE((
               SELECT GROUP_CONCAT(sp.Name ORDER BY sp.Name SEPARATOR ', ')
               FROM Specializations sp
               WHERE sp.ClassId = fc.ClassId AND sp.IsActive = 1 AND sp.DeletedDate IS NULL
           ), '') AS Specializations
    FROM FullConfigurations fc
    WHERE fc.Id = LAST_INSERT_ID();
END$$

-- Updates a configuration snapshot and returns the updated row with live data.
DROP PROCEDURE IF EXISTS sp_FullConfig_Update$$

CREATE PROCEDURE sp_FullConfig_Update(
    IN pId INT,
    IN pBoardId INT, IN pBoardName VARCHAR(150),
    IN pSessionId INT, IN pSessionName VARCHAR(150),
    IN pSchoolId INT, IN pSchoolName VARCHAR(150),
    IN pClassId INT, IN pClassName VARCHAR(150), IN pClassSection VARCHAR(25),
    IN pUpdatedBy VARCHAR(100),
    IN pStreams VARCHAR(1000), IN pSpecializations VARCHAR(1000)
)
BEGIN
    UPDATE FullConfigurations
    SET BoardId = pBoardId, BoardName = pBoardName,
        SessionId = pSessionId, SessionName = pSessionName,
        SchoolId = pSchoolId, SchoolName = pSchoolName,
        ClassId = pClassId, ClassName = pClassName, ClassSection = pClassSection,
        UpdatedBy = pUpdatedBy, UpdatedDate = UTC_TIMESTAMP(6),
        Specializations = pSpecializations, Streams = pStreams
    WHERE Id = pId;

    SELECT fc.Id, fc.BoardId, fc.BoardName, fc.SessionId, fc.SessionName,
           fc.SchoolId, fc.SchoolName, fc.ClassId, fc.ClassName, fc.ClassSection,
           COALESCE((
               SELECT GROUP_CONCAT(st.Name ORDER BY st.Name SEPARATOR ', ')
               FROM Streams st
               WHERE st.ClassId = fc.ClassId AND st.IsActive = 1 AND st.DeletedDate IS NULL
           ), '') AS Streams,
           COALESCE((
               SELECT GROUP_CONCAT(sp.Name ORDER BY sp.Name SEPARATOR ', ')
               FROM Specializations sp
               WHERE sp.ClassId = fc.ClassId AND sp.IsActive = 1 AND sp.DeletedDate IS NULL
           ), '') AS Specializations
    FROM FullConfigurations fc
    WHERE fc.Id = pId;
END$$

-- Soft-deletes a configuration snapshot.
DROP PROCEDURE IF EXISTS sp_FullConfig_Delete$$

CREATE PROCEDURE sp_FullConfig_Delete(
    IN pId INT,
    IN pDeletedBy VARCHAR(100)
)
BEGIN
    UPDATE FullConfigurations
    SET IsActive = 0,
        DeletedBy = pDeletedBy,
        DeletedDate = UTC_TIMESTAMP(6)
    WHERE Id = pId;
END$$

DELIMITER ;


-- ============================================================
-- DEFAULT ADMIN (username: admin, password: 123456789)
-- ============================================================
INSERT INTO users (Username, PasswordHash, Role, CreatedAt) VALUES ('admin', '$2a$11$NqD5/RqJuEffgm2suztneOOl6Hna6gGINwU8E5P/No0rk00SQKxXS', 'Admin', UTC_TIMESTAMP(6));
