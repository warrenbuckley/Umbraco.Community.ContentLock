using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Scoping;

namespace ContentLock.Testing.Controllers
{
    /// <summary>
    /// Test-only API controller for resetting content locks during E2E testing.
    /// This controller is only available in Development environment.
    /// </summary>
    [ApiController]
    [Route("umbraco/api/test")]
    public class ResetContentLocksController : ControllerBase
    {
        private readonly IScopeProvider _scopeProvider;
        private readonly ILogger<ResetContentLocksController> _logger;
        private readonly IWebHostEnvironment _environment;

        public ResetContentLocksController(
            IScopeProvider scopeProvider,
            ILogger<ResetContentLocksController> logger,
            IWebHostEnvironment environment)
        {
            _scopeProvider = scopeProvider;
            _logger = logger;
            _environment = environment;
        }

        /// <summary>
        /// Resets (deletes) all content locks. Only available in Development environment.
        /// </summary>
        /// <returns>Success message with count of deleted locks</returns>
        [HttpPost("reset-contentlocks")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> ResetContentLocks()
        {
            // Only allow this in Development environment to prevent accidental use in production
            if (!_environment.IsDevelopment())
            {
                _logger.LogWarning("Attempt to reset content locks in non-development environment");
                return Forbid("Reset content locks is only available in Development environment");
            }

            try
            {
                int deletedCount = 0;
                const string tableName = "ContentLocks";
                
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    // Get count before deletion for logging
                    deletedCount = scope.Database.ExecuteScalar<int>($"SELECT COUNT(*) FROM {tableName}");
                    
                    // Delete all content locks
                    var rowsAffected = scope.Database.Execute($"DELETE FROM {tableName}");
                    
                    _logger.LogInformation("Deleted {RowsAffected} content locks", rowsAffected);
                }

                _logger.LogInformation("Reset content locks - deleted {DeletedCount} locks", deletedCount);
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully reset content locks - deleted {deletedCount} locks",
                    deletedCount = deletedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting content locks");
                return StatusCode(StatusCodes.Status500InternalServerError, new { 
                    success = false, 
                    message = "Error resetting content locks", 
                    error = ex.Message 
                });
            }
        }
    }
}