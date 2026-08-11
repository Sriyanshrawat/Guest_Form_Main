using Dapper;
using GuestApi.Data;
using GuestApi.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;

namespace GuestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentSubmissionsController : ControllerBase
    {
        private readonly DapperContext _db;

        // injects the Dapper database context
        public StudentSubmissionsController(DapperContext db)
        {
            _db = db;
        }

        // GET /api/StudentSubmissions — admin sees every application, newest first.
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<StudentSubmissionResponseDto>>> GetAll([FromQuery] bool includeInactive = false)
        {
            using var conn = _db.CreateConnection();
            var rows = (await conn.QueryAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetAll,
                new { pIncludeInactive = includeInactive },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(rows);
        }

        // GET /api/StudentSubmissions/my — the submissions the current user submitted.
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<StudentSubmissionResponseDto>>> GetMy()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();
            var rows = (await conn.QueryAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetMy,
                new { pUsername = username },
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(rows);
        }

        // GET /api/StudentSubmissions/{id} — a single submission (admin or owner).
        [HttpGet("{id:int}")]
        public async Task<ActionResult<StudentSubmissionResponseDto>> GetById(int id)
        {
            using var conn = _db.CreateConnection();
            var row = await conn.QuerySingleOrDefaultAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (row == null)
                return NotFound(new { message = $"Submission with Id {id} not found." });

            var username = User.Identity?.Name;
            if (!User.IsInRole("Admin") && !string.Equals(row.Username, username, StringComparison.OrdinalIgnoreCase))
                return Forbid();

            return Ok(row);
        }

        // POST /api/StudentSubmissions — submit a new application (Pending).
        [HttpPost]
        public async Task<ActionResult<StudentSubmissionResponseDto>> Create(StudentSubmissionCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();

            // one-active-application rule: rejected submissions free the user to re-apply.
            if (!User.IsInRole("Admin"))
            {
                var hasActive = await conn.QuerySingleAsync<int>(
                    StoredProcedures.StudentSubmissions_UserHasActiveSubmission,
                    new { pUsername = username },
                    commandType: CommandType.StoredProcedure);
                if (hasActive > 0)
                    return Conflict(new { message = "You already have an application under review. You may edit or delete it, or wait for the admin decision." });
            }

            // email uniqueness across the queue + approved students
            var emailTaken = await conn.QuerySingleAsync<int>(
                StoredProcedures.StudentSubmissions_EmailExists,
                new { pEmail = dto.Email },
                commandType: CommandType.StoredProcedure);
            if (emailTaken > 0)
                return Conflict(new { message = "A student with this email has already applied or been registered." });

            var created = await conn.QuerySingleAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_Create,
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
                    pBoardId = dto.BoardId,
                    pSessionId = dto.SessionId,
                    pSchoolId = dto.SchoolId,
                    pClassId = dto.ClassId,
                    pStreamId = dto.StreamId,
                    pSpecializationId = dto.SpecializationId,
                    pUsername = username
                },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        // PUT /api/StudentSubmissions/{id} — update a Pending application (owner or admin).
        [HttpPut("{id:int}")]
        public async Task<ActionResult<StudentSubmissionResponseDto>> Update(int id, StudentSubmissionUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();

            var existing = await conn.QuerySingleOrDefaultAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (existing == null)
                return NotFound(new { message = $"Submission with Id {id} not found." });

            if (!User.IsInRole("Admin") && !string.Equals(existing.Username, username, StringComparison.OrdinalIgnoreCase))
                return Forbid();

            if (existing.Status != "Pending")
                return Conflict(new { message = "Only pending applications can be edited." });

            var emailTaken = await conn.QuerySingleAsync<int>(
                StoredProcedures.StudentSubmissions_EmailExistsExclude,
                new { pEmail = dto.Email, pExcludeId = id },
                commandType: CommandType.StoredProcedure);
            if (emailTaken > 0)
                return Conflict(new { message = "Another student already uses this email." });

            var updated = await conn.QuerySingleAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_Update,
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

        // POST /api/StudentSubmissions/{id}/approve — admin accepts (one-time; copies to Students).
        [HttpPost("{id:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudentSubmissionResponseDto>> Approve(int id)
        {
            using var conn = _db.CreateConnection();

            var existing = await conn.QuerySingleOrDefaultAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (existing == null)
                return NotFound(new { message = $"Submission with Id {id} not found." });

            if (existing.Status != "Pending")
                return Conflict(new { message = "This application has already been reviewed." });

            var approved = await conn.QuerySingleAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_Approve,
                new { pId = id, pReviewedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(approved);
        }

        // POST /api/StudentSubmissions/{id}/reject — admin declines (note optional).
        [HttpPost("{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudentSubmissionResponseDto>> Reject(int id, StudentRejectDto? dto)
        {
            using var conn = _db.CreateConnection();

            var existing = await conn.QuerySingleOrDefaultAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (existing == null)
                return NotFound(new { message = $"Submission with Id {id} not found." });

            if (existing.Status != "Pending")
                return Conflict(new { message = "This application has already been reviewed." });

            var rejected = await conn.QuerySingleAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_Reject,
                new
                {
                    pId = id,
                    pReviewedBy = User.Identity?.Name ?? "admin",
                    pReviewNote = dto?.Note?.Trim()
                },
                commandType: CommandType.StoredProcedure);

            return Ok(rejected);
        }

        // DELETE /api/StudentSubmissions/{id} — owner withdraws their Pending one; admin any.
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            using var conn = _db.CreateConnection();

            var existing = await conn.QuerySingleOrDefaultAsync<StudentSubmissionResponseDto>(
                StoredProcedures.StudentSubmission_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (existing == null)
                return NotFound(new { message = $"Submission with Id {id} not found." });

            if (!User.IsInRole("Admin") && !string.Equals(existing.Username, username, StringComparison.OrdinalIgnoreCase))
                return Forbid();

            await conn.ExecuteAsync(
                StoredProcedures.StudentSubmission_Delete,
                new { pId = id, pDeletedBy = username },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}
