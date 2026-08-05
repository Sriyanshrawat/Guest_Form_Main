using Dapper;
using GuestApi.Data;
using GuestApi.DTOs;
using GuestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;

namespace GuestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly DapperContext _db;

        public StudentsController(DapperContext db)
        {
            _db = db;
        }

        // GET /api/Students — returns every ACTIVE student across all users, newest first.
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<StudentResponseDto>>> GetStudents([FromQuery] bool includeInactive = false)
        {
            using var conn = _db.CreateConnection();
            var students = (await conn.QueryAsync<StudentResponseDto>(
                StoredProcedures.Student_GetAll,
                new { pIncludeInactive = includeInactive },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(students);
        }

        // GET /api/Students/{id} — returns a single student by id, or 404 if missing.
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudentResponseDto>> GetStudent(int id)
        {
            using var conn = _db.CreateConnection();
            var student = await conn.QuerySingleOrDefaultAsync<StudentResponseDto>(
                StoredProcedures.Student_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (student == null)
                return NotFound(new { message = $"Student with Id {id} not found." });
            return Ok(student);
        }

        // GET /api/Students/my — returns the ACTIVE students the current user submitted.
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<StudentResponseDto>>> GetMyStudents()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();
            var students = (await conn.QueryAsync<StudentResponseDto>(
                StoredProcedures.Student_GetMy,
                new { pUsername = username },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(students);
        }

        // POST /api/Students — creates a new student record for the authenticated user.
        [HttpPost]
        public async Task<ActionResult<Student>> CreateStudent(StudentCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name ?? "unknown";
            using var conn = _db.CreateConnection();

            // one-entry-per-user guard for non-admins
            if (!User.IsInRole("Admin"))
            {
                var alreadyHasEntry = await conn.QuerySingleAsync<int>(
                    StoredProcedures.Students_UserHasActiveEntry,
                    new { pUsername = username },
                    commandType: CommandType.StoredProcedure);
                if (alreadyHasEntry > 0)
                    return Conflict(new { message = "You have already registered a student. You may edit or delete your existing entry." });
            }

            // email uniqueness guard
            var emailExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Students_EmailExists,
                new { pEmail = dto.Email },
                commandType: CommandType.StoredProcedure);
            if (emailExists > 0)
                return Conflict(new { message = "A student with this email already exists." });

            var student = await conn.QuerySingleAsync<StudentResponseDto>(
                StoredProcedures.Student_Create,
                new
                {
                    pFirstName = dto.FirstName,
                    pLastName = dto.LastName,
                    pGender = dto.Gender,
                    pDateOfBirth = dto.DateOfBirth,
                    pEmail = dto.Email,
                    pPhoneNumber = dto.PhoneNumber,
                    pAddress = dto.Address,
                    pBloodGroup = dto.BloodGroup,
                    pFatherName = dto.FatherName,
                    pMotherName = dto.MotherName,
                    pFatherPhone = dto.FatherPhone,
                    pMotherPhone = dto.MotherPhone,
                    pEmergencyContactName = dto.EmergencyContactName,
                    pEmergencyContactPhone = dto.EmergencyContactPhone,
                    pAadhaarNumber = dto.AadhaarNumber,
                    pNationality = dto.Nationality,
                    pReligion = dto.Religion,
                    pMotherTongue = dto.MotherTongue,
                    pCategory = dto.Category,
                    pEnrollmentNumber = dto.EnrollmentNumber,
                    pRollNumber = dto.RollNumber,
                    pBoardId = dto.BoardId,
                    pSessionId = dto.SessionId,
                    pSchoolId = dto.SchoolId,
                    pClassId = dto.ClassId,
                    pStreamId = dto.StreamId,
                    pSpecializationId = dto.SpecializationId,
                    pInsertedBy = username
                },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, student);
        }

        // PUT /api/Students/{id} — updates an existing student's fields.
        [HttpPut("{id:int}")]
        public async Task<ActionResult<StudentResponseDto>> UpdateStudent(int id, StudentUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();

            var student = await conn.QuerySingleOrDefaultAsync<Student>(
                StoredProcedures.Student_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (student == null)
                return NotFound(new { message = $"Student with Id {id} not found." });

            // ownership guard: only admins may edit other users' entries
            if (!User.IsInRole("Admin") && student.InsertedBy != username)
                return Forbid();

            // email uniqueness guard excluding this record
            var emailTaken = await conn.QuerySingleAsync<int>(
                StoredProcedures.Students_EmailExistsExclude,
                new { pEmail = dto.Email, pExcludeId = id },
                commandType: CommandType.StoredProcedure);
            if (emailTaken > 0)
                return Conflict(new { message = "Another student already uses this email." });

            var updated = await conn.QuerySingleAsync<StudentResponseDto>(
                StoredProcedures.Student_Update,
                new
                {
                    pId = id,
                    pFirstName = dto.FirstName,
                    pLastName = dto.LastName,
                    pGender = dto.Gender,
                    pDateOfBirth = dto.DateOfBirth,
                    pEmail = dto.Email,
                    pPhoneNumber = dto.PhoneNumber,
                    pAddress = dto.Address,
                    pBloodGroup = dto.BloodGroup,
                    pFatherName = dto.FatherName,
                    pMotherName = dto.MotherName,
                    pFatherPhone = dto.FatherPhone,
                    pMotherPhone = dto.MotherPhone,
                    pEmergencyContactName = dto.EmergencyContactName,
                    pEmergencyContactPhone = dto.EmergencyContactPhone,
                    pAadhaarNumber = dto.AadhaarNumber,
                    pNationality = dto.Nationality,
                    pReligion = dto.Religion,
                    pMotherTongue = dto.MotherTongue,
                    pCategory = dto.Category,
                    pEnrollmentNumber = dto.EnrollmentNumber,
                    pRollNumber = dto.RollNumber,
                    pBoardId = dto.BoardId,
                    pSessionId = dto.SessionId,
                    pSchoolId = dto.SchoolId,
                    pClassId = dto.ClassId,
                    pStreamId = dto.StreamId,
                    pSpecializationId = dto.SpecializationId,
                    pUpdatedBy = username
                },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // DELETE /api/Students/{id} — soft-deletes a student.
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();

            var student = await conn.QuerySingleOrDefaultAsync<Student>(
                StoredProcedures.Student_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (student == null)
                return NotFound(new { message = $"Student with Id {id} not found." });

            // ownership guard
            if (!User.IsInRole("Admin") && student.InsertedBy != username)
                return Forbid();

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.Student_Delete,
                new { pId = id, pDeletedBy = username },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }

        // get active boards as lookup options
        [HttpGet("boards")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetBoards()
        {
            using var conn = _db.CreateConnection();
            var boards = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Boards,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(boards);
        }

        // get active sessions as lookup options
        [HttpGet("boards/{boardId:int}/sessions")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetSessionsForBoard(int boardId)
        {
            using var conn = _db.CreateConnection();
            var sessions = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Sessions,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(sessions);
        }

        // get active schools as lookup options
        [HttpGet("boards/{boardId:int}/sessions/{sessionId:int}/schools")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetSchools(int boardId, int sessionId)
        {
            using var conn = _db.CreateConnection();
            var schools = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Schools,
                new { pBoardId = boardId },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(schools);
        }

        // get active classes as lookup options
        [HttpGet("boards/{boardId:int}/sessions/{sessionId:int}/schools/{schoolId:int}/classes")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetClasses(int boardId, int sessionId, int schoolId)
        {
            using var conn = _db.CreateConnection();
            var classes = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Classes,
                new { pSchoolId = schoolId, pSessionId = (int?)null },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(classes);
        }

        // get active streams as lookup options
        [HttpGet("classes/{classId:int}/streams")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetStreamsForClass(int classId)
        {
            using var conn = _db.CreateConnection();
            var streams = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Streams,
                new { pClassId = classId },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(streams);
        }

        // get specializations only for XI/XII classes
        [HttpGet("classes/{classId:int}/specializations")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetSpecializationsForClass(int classId)
        {
            using var conn = _db.CreateConnection();

            var className = await conn.QuerySingleOrDefaultAsync<string>(
                StoredProcedures.Class_GetNameById,
                new { pId = classId },
                commandType: CommandType.StoredProcedure);

            if (className != "XI" && className != "XII")
                return Ok(Array.Empty<LookupOptionDto>());

            var specializations = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Specializations,
                new { pClassId = classId },
                commandType: CommandType.StoredProcedure)).ToList();

            return Ok(specializations);
        }
    }
}