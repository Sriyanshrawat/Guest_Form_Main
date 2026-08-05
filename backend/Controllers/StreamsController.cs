using Dapper;
using GuestApi.Data;
using GuestApi.DTOs;
using GuestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using Stream = GuestApi.Models.Stream;

namespace GuestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StreamsController : ControllerBase
    {
        private readonly DapperContext _db;

        public StreamsController(DapperContext db) => _db = db;

        // get all streams
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Stream>>> GetStreams()
        {
            using var conn = _db.CreateConnection();
            var streams = (await conn.QueryAsync<Stream>(
                StoredProcedures.Stream_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(streams);
        }

        // create stream
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Stream>> CreateStream(CreateStreamDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var classExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Stream_ClassExists,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            if (classExists == 0) return BadRequest(new { message = "Select a valid class." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Stream_Exists,
                new { pClassId = dto.ClassId, pName = dto.Name.Trim(), pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "This stream already exists for the selected class." });

            var stream = await conn.QuerySingleAsync<Stream>(
                StoredProcedures.Stream_Create,
                new { pClassId = dto.ClassId, pName = dto.Name.Trim(), pAcronym = dto.Acronym?.Trim(), pInsertedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetStreams), new { id = stream.Id }, stream);
        }

        // update stream
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Stream>> UpdateStream(int id, UpdateStreamDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var stream = await conn.QuerySingleOrDefaultAsync<Stream>(
                StoredProcedures.Stream_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (stream == null || stream.DeletedDate.HasValue) return NotFound(new { message = "Stream not found." });

            var classExists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Stream_ClassExists,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            if (classExists == 0) return BadRequest(new { message = "Select a valid class." });

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Stream_Exists,
                new { pClassId = dto.ClassId, pName = dto.Name.Trim(), pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (exists > 0) return Conflict(new { message = "Another stream already exists for the selected class." });

            var updated = await conn.QuerySingleAsync<Stream>(
                StoredProcedures.Stream_Update,
                new { pId = id, pClassId = dto.ClassId, pName = dto.Name.Trim(), pAcronym = dto.Acronym?.Trim(), pIsActive = dto.IsActive, pUpdatedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete stream
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteStream(int id)
        {
            using var conn = _db.CreateConnection();

            var stream = await conn.QuerySingleOrDefaultAsync<Stream>(
                StoredProcedures.Stream_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (stream == null || stream.DeletedDate.HasValue) return NotFound(new { message = "Stream not found." });

            // guard: refuse delete while active students reference this stream
            var activeStudents = await conn.QuerySingleAsync<int>(
                StoredProcedures.Streams_ActiveStudentsCount,
                new { pStreamId = id },
                commandType: CommandType.StoredProcedure);
            if (activeStudents > 0)
                return Conflict(new { message = "Cannot delete this stream because it has active students. Remove the students first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.Stream_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}