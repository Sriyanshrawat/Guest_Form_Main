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
    public class FullConfigurationController : ControllerBase
    {
        private readonly DapperContext _db;

        public FullConfigurationController(DapperContext db) => _db = db;

        // get boards
        [HttpGet("boards")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetBoards()
        {
            using var conn = _db.CreateConnection();
            var boards = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Boards,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(boards);
        }

        // get sessions for board
        [HttpGet("boards/{boardId:int}/sessions")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetSessionsForBoard(int boardId)
        {
            using var conn = _db.CreateConnection();
            var sessions = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Sessions,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(sessions);
        }

        // get schools for board/session
        [HttpGet("boards/{boardId:int}/sessions/{sessionId:int}/schools")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetSchools(
            int boardId, int sessionId)
        {
            using var conn = _db.CreateConnection();

            // validate parent entities
            if (await BoardExists(conn, boardId) == 0)
                return NotFound(new { message = "Board not found." });
            if (await SessionExists(conn, sessionId) == 0)
                return NotFound(new { message = "Session not found." });

            var schools = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Schools,
                new { pBoardId = boardId },
                commandType: CommandType.StoredProcedure)).ToList();

            return Ok(schools);
        }

        // get classes for school
        [HttpGet("boards/{boardId:int}/sessions/{sessionId:int}/schools/{schoolId:int}/classes")]
        public async Task<ActionResult<IEnumerable<LookupOptionDto>>> GetClasses(
            int boardId, int sessionId, int schoolId)
        {
            using var conn = _db.CreateConnection();

            // validate parent entities
            if (await BoardExists(conn, boardId) == 0)
                return NotFound(new { message = "Board not found." });
            if (await SessionExists(conn, sessionId) == 0)
                return NotFound(new { message = "Session not found." });
            if (await SchoolExists(conn, schoolId) == 0)
                return NotFound(new { message = "School not found." });

            var classes = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Classes,
                new { pSchoolId = schoolId, pSessionId = (int?)sessionId },
                commandType: CommandType.StoredProcedure)).ToList();

            return Ok(classes);
        }

        // get details
        [HttpGet("details")]
        public async Task<ActionResult<SpecializationDetailsDto>> GetDetails(
            [FromQuery] int sessionId,
            [FromQuery] int classId)
        {
            using var conn = _db.CreateConnection();

            var session = await conn.QuerySingleOrDefaultAsync<Session>(
                StoredProcedures.Session_GetById,
                new { pId = sessionId },
                commandType: CommandType.StoredProcedure);
            if (session == null || !session.IsActive || session.DeletedDate.HasValue)
                return NotFound(new { message = "Session not found." });

            var classRow = await conn.QuerySingleOrDefaultAsync<ClassRecord>(
                StoredProcedures.Class_GetById,
                new { pId = classId },
                commandType: CommandType.StoredProcedure);
            if (classRow == null || !classRow.IsActive || classRow.DeletedDate.HasValue)
                return NotFound(new { message = "Class not found." });

            if (classRow.SchoolId == null)
                return BadRequest(new { message = "Class is not attached to a school." });

            // walk the hierarchy upward
            var school = await conn.QuerySingleOrDefaultAsync<School>(
                StoredProcedures.School_GetById,
                new { pId = classRow.SchoolId },
                commandType: CommandType.StoredProcedure);
            if (school == null)
                return NotFound(new { message = "School not found." });

            var board = await conn.QuerySingleOrDefaultAsync<SchoolBoard>(
                StoredProcedures.SchoolBoard_GetById,
                new { pId = school.SchoolBoardId },
                commandType: CommandType.StoredProcedure);
            if (board == null)
                return NotFound(new { message = "Board not found." });

            var streams = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Streams,
                new { pClassId = classId },
                commandType: CommandType.StoredProcedure)).ToList();

            var specializations = (await conn.QueryAsync<LookupOptionDto>(
                StoredProcedures.Lookup_Specializations,
                new { pClassId = classId },
                commandType: CommandType.StoredProcedure)).ToList();

            return Ok(new SpecializationDetailsDto
            {
                SessionId = session.Id,
                SessionName = session.Name,
                BoardId = board.Id,
                BoardName = board.UniversityName,
                SchoolId = school.Id,
                SchoolName = school.Name,
                ClassId = classRow.Id,
                ClassName = classRow.Name,
                ClassSection = classRow.Section,
                Streams = streams,
                Specializations = specializations
            });
        }

        // save configuration
        [HttpPost("save")]
        public async Task<ActionResult<ConfigurationListItemDto>> SaveConfiguration(SaveConfigurationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            // prevent duplicate configuration
            var duplicate = await conn.QuerySingleAsync<int>(
                StoredProcedures.FullConfig_DuplicateCheck,
                new { pBoardId = dto.BoardId, pSessionId = dto.SessionId, pSchoolId = dto.SchoolId, pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);

            if (duplicate > 0)
                return Conflict(new { message = "This board, session, school, and class configuration is already saved." });

            // snapshot current streams and specializations
            var streams = await conn.QuerySingleAsync<string>(
                StoredProcedures.Streams_ConcatByClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            var specializations = await conn.QuerySingleAsync<string>(
                StoredProcedures.Specializations_ConcatByClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);

            var config = await conn.QuerySingleAsync<ConfigurationListItemDto>(
                StoredProcedures.FullConfig_Create,
                new
                {
                    pBoardId = dto.BoardId,
                    pBoardName = dto.BoardName,
                    pSessionId = dto.SessionId,
                    pSessionName = dto.SessionName,
                    pSchoolId = dto.SchoolId,
                    pSchoolName = dto.SchoolName,
                    pClassId = dto.ClassId,
                    pClassName = dto.ClassName,
                    pClassSection = dto.ClassSection,
                    pCreatedBy = User.Identity?.Name ?? "unknown",
                    pStreams = streams,
                    pSpecializations = specializations
                },
                commandType: CommandType.StoredProcedure);

            return Ok(config);
        }

        // get saved configurations
        [HttpGet("saved")]
        public async Task<ActionResult<IEnumerable<ConfigurationListItemDto>>> GetSavedConfigurations()
        {
            using var conn = _db.CreateConnection();
            var items = (await conn.QueryAsync<ConfigurationListItemDto>(
                StoredProcedures.FullConfig_GetSaved,
                commandType: CommandType.StoredProcedure)).ToList();
            return Ok(items);
        }

        // update configuration
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ConfigurationListItemDto>> UpdateConfiguration(int id, SaveConfigurationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using var conn = _db.CreateConnection();

            var config = await conn.QuerySingleOrDefaultAsync<FullConfiguration>(
                StoredProcedures.FullConfig_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (config == null)
                return NotFound(new { message = "Configuration not found." });

            // re-snapshot current streams and specializations
            var streams = await conn.QuerySingleAsync<string>(
                StoredProcedures.Streams_ConcatByClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);
            var specializations = await conn.QuerySingleAsync<string>(
                StoredProcedures.Specializations_ConcatByClass,
                new { pClassId = dto.ClassId },
                commandType: CommandType.StoredProcedure);

            var updated = await conn.QuerySingleAsync<ConfigurationListItemDto>(
                StoredProcedures.FullConfig_Update,
                new
                {
                    pId = id,
                    pBoardId = dto.BoardId,
                    pBoardName = dto.BoardName,
                    pSessionId = dto.SessionId,
                    pSessionName = dto.SessionName,
                    pSchoolId = dto.SchoolId,
                    pSchoolName = dto.SchoolName,
                    pClassId = dto.ClassId,
                    pClassName = dto.ClassName,
                    pClassSection = dto.ClassSection,
                    pUpdatedBy = User.Identity?.Name ?? "unknown",
                    pStreams = streams,
                    pSpecializations = specializations
                },
                commandType: CommandType.StoredProcedure);

            return Ok(updated);
        }

        // delete configuration
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteConfiguration(int id)
        {
            using var conn = _db.CreateConnection();

            var config = await conn.QuerySingleOrDefaultAsync<FullConfiguration>(
                StoredProcedures.FullConfig_GetById,
                new { pId = id },
                commandType: CommandType.StoredProcedure);
            if (config == null)
                return NotFound(new { message = "Configuration not found." });

            // soft delete
            await conn.ExecuteAsync(
                StoredProcedures.FullConfig_Delete,
                new { pId = id, pDeletedBy = User.Identity?.Name ?? "unknown" },
                commandType: CommandType.StoredProcedure);

            return NoContent();
        }

        // parent existence checks
        private Task<int> BoardExists(System.Data.IDbConnection conn, int id) =>
            conn.QuerySingleAsync<int>(StoredProcedures.School_BoardExists, new { pBoardId = id }, commandType: CommandType.StoredProcedure);

        private Task<int> SessionExists(System.Data.IDbConnection conn, int id) =>
            conn.QuerySingleAsync<int>(StoredProcedures.Session_ActiveExists, new { pId = id }, commandType: CommandType.StoredProcedure);

        private Task<int> SchoolExists(System.Data.IDbConnection conn, int id) =>
            conn.QuerySingleAsync<int>(StoredProcedures.School_ActiveExists, new { pId = id }, commandType: CommandType.StoredProcedure);
    }
}