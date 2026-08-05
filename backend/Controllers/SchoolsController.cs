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
    public class SchoolsController : ControllerBase
    {
        private readonly DapperContext _db;

        public SchoolsController(DapperContext db) => _db = db;

        // get all schools
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SchoolListItemDto>>> GetSchools()
        {
            using var conn = _db.CreateConnection();
            var schools = (await conn.QueryAsync<SchoolListItemDto>(
                StoredProcedures.School_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();

            // deduplicate by board/name and sort
            var uniqueSchools = schools
                .GroupBy(school => new { school.SchoolBoardId, Name = school.Name.Trim().ToUpperInvariant() })
                .Select(group => group.OrderByDescending(school => school.Id).First())
                .OrderBy(school => school.SchoolBoardName)
                .ThenBy(school => school.Name)
                .ToList();

            return Ok(uniqueSchools);
        }

        // create school
        [HttpPost]
        public async Task<ActionResult<School>> CreateSchool(CreateSchoolDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var boardExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.School_BoardExists,
                new { pBoardId = dto.SchoolBoardId },
                commandType: CommandType.StoredProcedure);
            if (boardExists == 0) return BadRequest(new { message = "Select a valid school board." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.School_Exists,
                new { pBoardId = dto.SchoolBoardId, pName = dto.Name.Trim(), pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "This school already exists for the selected board." });

            var school = await conn.QuerySingleAsync<School>(
                StoredProcedures.School_Create,
                new { pSchoolBoardId = dto.SchoolBoardId, pName = dto.Name.Trim(), pInsertedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetSchools), new { id = school.Id }, school);
        }

        // update school
        [HttpPut("{id:int}")]
        public async Task<ActionResult<School>> UpdateSchool(int id, UpdateSchoolDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var school = await conn.QuerySingleOrDefaultAsync<School>(
                StoredProcedures.School_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (school == null || school.DeletedDate.HasValue) return NotFound(new { message = "School not found." });

            var boardExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.School_BoardExists,
                new { pBoardId = dto.SchoolBoardId },
                commandType: CommandType.StoredProcedure);
            if (boardExists == 0) return BadRequest(new { message = "Select a valid school board." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.School_Exists,
                new { pBoardId = dto.SchoolBoardId, pName = dto.Name.Trim(), pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "This school already exists for the selected board." });

            var updated = await conn.QuerySingleAsync<School>(
                StoredProcedures.School_Update,
                new { pId = id, pSchoolBoardId = dto.SchoolBoardId, pName = dto.Name.Trim(), pIsActive = dto.IsActive, pUpdatedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete school
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSchool(int id)
        {
            using var conn = _db.CreateConnection();

            var school = await conn.QuerySingleOrDefaultAsync<School>(
                StoredProcedures.School_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (school == null || school.DeletedDate.HasValue) return NotFound(new { message = "School not found." });

            // refuse if still referenced by active classes
            var activeClasses = await conn.QuerySingleAsync<int>(
                StoredProcedures.Schools_ActiveClassesCount,
                new { pSchoolId = id },
                commandType: CommandType.StoredProcedure);
            if (activeClasses > 0)
                return Conflict(new { message = "Cannot delete this school because it has active classes. Remove the classes first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.School_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}