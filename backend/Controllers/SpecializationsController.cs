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
    public class SpecializationsController : ControllerBase
    {
        private readonly DapperContext _db;

        public SpecializationsController(DapperContext db) => _db = db;

        // get all specializations
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Specialization>>> GetSpecializations()
        {
            using var conn = _db.CreateConnection();
            var items = (await conn.QueryAsync<Specialization>(
                StoredProcedures.Specialization_GetAll,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(items);
        }

        // create specialization
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Specialization>> CreateSpecialization(CreateSpecializationDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            // business rule: senior classes only
            var eligible = await conn.QuerySingleAsync<int>(
                StoredProcedures.Specialization_IsEligibleClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            if (eligible == 0)
                return BadRequest(new { message = "Specializations can only be added for Class XI or XII." });

            // consistency: stream must belong to the class
            if (dto.StreamId.HasValue)
            {
                var streamOk = await conn.QuerySingleAsync<int>(
                    StoredProcedures.Specialization_StreamBelongsToClass,
                    new { pClassId = dto.ClassId, pStreamId = dto.StreamId.Value },
                    commandType: CommandType.StoredProcedure);
                if (streamOk == 0)
                    return BadRequest(new { message = "Selected stream does not belong to the chosen class." });
            }

            // uniqueness guard
            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Specialization_Exists,
                new { pClassId = dto.ClassId, pName = dto.Name.Trim(), pExcludeId = (int?)null },
                commandType: CommandType.StoredProcedure);
            if (exists > 0)
                return Conflict(new { message = "This specialization already exists for the selected class." });

            var item = await conn.QuerySingleAsync<Specialization>(
                StoredProcedures.Specialization_Create,
                new { pClassId = dto.ClassId, pStreamId = dto.StreamId, pName = dto.Name.Trim(), pInsertedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return CreatedAtAction(nameof(GetSpecializations), new { id = item.Id }, item);
        }

        // update specialization
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Specialization>> UpdateSpecialization(int id, UpdateSpecializationDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<Specialization>(
                StoredProcedures.Specialization_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue)
                return NotFound(new { message = "Specialization not found." });

            var eligible = await conn.QuerySingleAsync<int>(
                StoredProcedures.Specialization_IsEligibleClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            if (eligible == 0)
                return BadRequest(new { message = "Specializations can only be added for Class XI or XII." });

            if (dto.StreamId.HasValue)
            {
                var streamOk = await conn.QuerySingleAsync<int>(
                    StoredProcedures.Specialization_StreamBelongsToClass,
                    new { pClassId = dto.ClassId, pStreamId = dto.StreamId.Value },
                    commandType: CommandType.StoredProcedure);
                if (streamOk == 0)
                    return BadRequest(new { message = "Selected stream does not belong to the chosen class." });
            }

            var exists = await conn.QuerySingleAsync<int>(
                StoredProcedures.Specialization_Exists,
                new { pClassId = dto.ClassId, pName = dto.Name.Trim(), pExcludeId = (int?)id },
                commandType: CommandType.StoredProcedure);
            if (exists > 0)
                return Conflict(new { message = "Another specialization already exists for the selected class." });

            var updated = await conn.QuerySingleAsync<Specialization>(
                StoredProcedures.Specialization_Update,
                new { pId = id, pClassId = dto.ClassId, pStreamId = dto.StreamId, pName = dto.Name.Trim(), pIsActive = dto.IsActive, pUpdatedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete specialization
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteSpecialization(int id)
        {
            using var conn = _db.CreateConnection();

            var item = await conn.QuerySingleOrDefaultAsync<Specialization>(
                StoredProcedures.Specialization_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (item == null || item.DeletedDate.HasValue)
                return NotFound(new { message = "Specialization not found." });

            // refuse if still referenced by active students
            var activeStudents = await conn.QuerySingleAsync<int>(
                StoredProcedures.Specializations_ActiveStudentsCount,
                new { pSpecializationId = id },
                commandType: CommandType.StoredProcedure);
            if (activeStudents > 0)
                return Conflict(new { message = "Cannot delete this specialization because it has active students. Remove the students first." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.Specialization_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "admin" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }
    }
}