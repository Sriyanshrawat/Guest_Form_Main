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
    public class SessionsController : ControllerBase
    {
        private readonly DapperContext _db;

        // injects the Dapper database context
        public SessionsController(DapperContext db) => _db = db;

        // get all sessions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Session>>> GetSessions()
        {
            using var conn = _db.CreateConnection();
            var sessions = (await conn.QueryAsync<Session>(
                StoredProcedures.Session_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(sessions);
        }

        // create session
        [HttpPost]
        public async Task<ActionResult<Session>> CreateSession(CreateSessionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Session_NameExists,
                new { pName = dto.Name.Trim(), pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "A session with this name already exists." });

            var item = await conn.QuerySingleAsync<Session>(
                StoredProcedures.Session_Create,
                new { pName = dto.Name.Trim(), pInsertedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetSessions), new { id = item.Id }, item);
        }

        // update session
        [HttpPut("{id:int}")]
        public async Task<ActionResult<Session>> UpdateSession(int id, UpdateSessionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<Session>(
                StoredProcedures.Session_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue) return NotFound(new { message = "Session not found." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Session_NameExists,
                new { pName = dto.Name.Trim(), pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "Another session with this name already exists." });

            var updated = await conn.QuerySingleAsync<Session>(
                StoredProcedures.Session_Update,
                new { pId = id, pName = dto.Name.Trim(), pIsActive = dto.IsActive, pUpdatedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete session
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSession(int id)
        {
            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<Session>(
                StoredProcedures.Session_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue) return NotFound(new { message = "Session not found." });

            // refuse if still referenced by active classes
            var activeClasses = await conn.QuerySingleAsync<int>(StoredProcedures.Sessions_ActiveClassesCount, new { pSessionId = id }, commandType: CommandType.StoredProcedure);
            if (activeClasses > 0) return Conflict(new { message = "Cannot delete this session because it has active classes. Remove the classes first." });

            // refuse if still referenced by active students
            var activeStudents = await conn.QuerySingleAsync<int>(StoredProcedures.Sessions_ActiveStudentsCount, new { pSessionId = id }, commandType: CommandType.StoredProcedure);
            if (activeStudents > 0) return Conflict(new { message = "Cannot delete this session because it has active students. Remove the students first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.Session_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}