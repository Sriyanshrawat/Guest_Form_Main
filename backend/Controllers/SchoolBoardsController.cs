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
    public class SchoolBoardsController : ControllerBase
    {
        private readonly DapperContext _db;

        public SchoolBoardsController(DapperContext db)
        {
            _db = db;
        }

        // get all boards
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<SchoolBoard>>> GetSchoolBoards()
        {
            using var conn = _db.CreateConnection();
            var boards = (await conn.QueryAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();

            // deduplicate by name and sort
            var uniqueBoards = boards
                .GroupBy(board => board.UniversityName.Trim().ToUpperInvariant())
                .Select(group => group.OrderByDescending(board => board.Id).First())
                .OrderBy(board => board.UniversityName)
                .ToList();

            return Ok(uniqueBoards);
        }

        // create board
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SchoolBoard>> CreateSchoolBoard(CreateSchoolBoardDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // resolve authenticated user for audit
            var insertedBy = User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(insertedBy))
                return BadRequest(new { message = "InsertedBy could not be determined from the authenticated user." });

            using var conn = _db.CreateConnection();

            // uniqueness guard
            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.SchoolBoard_NameExists,
                new { pName = dto.name, pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);

            if (exists > 0)
                return Conflict(new { message = "A school board with this name already exists." });

            var board = await conn.QuerySingleAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_Create,
                new { pName = dto.name, pInsertedBy = insertedBy },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetSchoolBoards), new { id = board.Id }, board);
        }

        // update board
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateSchoolBoard(int id, UpdateSchoolBoardDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var existing = await conn.QuerySingleOrDefaultAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (existing == null || existing.DeletedDate.HasValue)
                return NotFound(new { message = $"SchoolBoard with Id {id} not found." });

            // uniqueness guard excluding this record
            var collides = await conn.QuerySingleAsync<int>(
                StoredProcedures.SchoolBoard_NameExists,
                new { pName = dto.name, pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (collides > 0)
                return Conflict(new { message = "Another school board already uses this name." });

            var updatedBy = User.Identity?.Name;
            var updated = await conn.QuerySingleAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_Update,
                new { pId = id, pName = dto.name, pIsActive = dto.IsActive, pUpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete board
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteSchoolBoard(int id)
        {
            using var conn = _db.CreateConnection();

            var board = await conn.QuerySingleOrDefaultAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (board == null)
                return NotFound(new { message = $"SchoolBoard with Id {id} not found." });

            // refuse if still referenced by active schools
            var activeSchools = await conn.QuerySingleAsync<int>(
                StoredProcedures.SchoolBoards_ActiveSchoolsCount,
                new { pBoardId = id },
                commandType: CommandType.StoredProcedure);
            if (activeSchools > 0)
                return Conflict(new { message = "Cannot delete this board because it has active schools. Remove the schools first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.SchoolBoard_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}