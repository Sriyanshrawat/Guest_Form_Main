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
    [Authorize(Roles = "Admin")]
    public class ClassesController : ControllerBase
    {
        private readonly DapperContext _db;

        public ClassesController(DapperContext db) => _db = db;

        // get all classes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClassRecord>>> GetClasses()
        {
            using var conn = _db.CreateConnection();
            var classes = (await conn.QueryAsync<ClassRecord>(
                StoredProcedures.Class_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();

            // deduplicate and sort
            var uniqueClasses = classes
                .GroupBy(item => new
                {
                    SchoolId = item.SchoolId,
                    Name = item.Name.Trim().ToUpperInvariant(),
                    Section = item.Section.Trim().ToUpperInvariant(),
                })
                .Select(group => group.OrderByDescending(item => item.Id).First())
                .OrderBy(item => item.SchoolName)
                .ThenBy(item => item.Name)
                .ThenBy(item => item.Section)
                .ToList();

            return Ok(uniqueClasses);
        }

        // create class
        [HttpPost]
        public async Task<ActionResult<ClassRecord>> CreateClass(CreateClassDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var schoolExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Class_SchoolExists,
                new { pSchoolId = dto.SchoolId },
                commandType: CommandType.StoredProcedure);
            if (schoolExists == 0) return BadRequest(new { message = "Select a valid school." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Class_Exists,
                new { pSchoolId = dto.SchoolId, pName = dto.Name.Trim(), pSection = dto.Section.Trim().ToUpperInvariant(), pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "This class and section already exist for the selected school." });

            var item = await conn.QuerySingleAsync<ClassRecord>(
                StoredProcedures.Class_Create,
                new { pSchoolId = dto.SchoolId, pSessionId = dto.SessionId, pName = dto.Name.Trim(), pSection = dto.Section.Trim().ToUpperInvariant(), pInsertedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetClasses), new { id = item.Id }, item);
        }

        // update class
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ClassRecord>> UpdateClass(int id, UpdateClassDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<ClassRecord>(
                StoredProcedures.Class_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue) return NotFound(new { message = "Class not found." });

            var schoolExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Class_SchoolExists,
                new { pSchoolId = dto.SchoolId },
                commandType: CommandType.StoredProcedure);
            if (schoolExists == 0) return BadRequest(new { message = "Select a valid school." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Class_Exists,
                new { pSchoolId = dto.SchoolId, pName = dto.Name.Trim(), pSection = dto.Section.Trim().ToUpperInvariant(), pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "Another class and section already exists for the selected school." });

            var updated = await conn.QuerySingleAsync<ClassRecord>(
                StoredProcedures.Class_Update,
                new { pId = id, pSchoolId = dto.SchoolId, pSessionId = dto.SessionId, pName = dto.Name.Trim(), pSection = dto.Section.Trim().ToUpperInvariant(), pIsActive = dto.IsActive, pUpdatedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete class
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteClass(int id)
        {
            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<ClassRecord>(
                StoredProcedures.Class_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue) return NotFound(new { message = "Class not found." });

            // refuse if still referenced by active streams
            var activeStreams = await conn.QuerySingleAsync<int>(StoredProcedures.Classes_ActiveStreamsCount, new { pClassId = id }, commandType: CommandType.StoredProcedure);
            if (activeStreams > 0) return Conflict(new { message = "Cannot delete this class because it has active streams. Remove the streams first." });

            // refuse if still referenced by active specializations
            var activeSpecs = await conn.QuerySingleAsync<int>(StoredProcedures.Classes_ActiveSpecializationsCount, new { pClassId = id }, commandType: CommandType.StoredProcedure);
            if (activeSpecs > 0) return Conflict(new { message = "Cannot delete this class because it has active specializations. Remove the specializations first." });

            // refuse if still referenced by active students
            var activeStudents = await conn.QuerySingleAsync<int>(StoredProcedures.Classes_ActiveStudentsCount, new { pClassId = id }, commandType: CommandType.StoredProcedure);
            if (activeStudents > 0) return Conflict(new { message = "Cannot delete this class because it has active students. Remove the students first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.Class_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}