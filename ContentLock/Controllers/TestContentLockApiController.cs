using ContentLock.Models.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Scoping;

namespace ContentLock.Controllers
{
#if DEBUG
    /// <summary>
    /// Test-only API controller for resetting content locks during E2E testing.
    /// This controller is only compiled in DEBUG builds and only available in Development environment.
    /// </summary>
    [ApiController]
    [Route("umbraco/api/test")]
    public class TestContentLockApiController : ControllerBase
    {
        private readonly IScopeProvider _scopeProvider;
        private readonly ILogger<TestContentLockApiController> _logger;
        private readonly IWebHostEnvironment _environment;

        public TestContentLockApiController(
            IScopeProvider scopeProvider,
            ILogger<TestContentLockApiController> logger,
            IWebHostEnvironment environment)
        {
            _scopeProvider = scopeProvider;
            _logger = logger;
            _environment = environment;
        }

        /// <summary>
        /// Resets (deletes) all content locks. Only available in Development environment and DEBUG builds.
        /// </summary>
        /// <returns>Success message with count of deleted locks</returns>
        [HttpPost("reset-contentlocks")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult ResetContentLocks()
        {
            // Double-check: Only allow this in Development environment
            if (!_environment.IsDevelopment())
            {
                _logger.LogWarning("Attempt to reset content locks in non-development environment");
                return Forbid("Reset content locks is only available in Development environment");
            }

            try
            {
                int deletedCount = 0;
                
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    // Get count before deletion for logging
                    deletedCount = scope.Database.ExecuteScalar<int>($"SELECT COUNT(*) FROM {ContentLocks.TableName}");
                    
                    // Delete all content locks using raw SQL for simplicity
                    var rowsAffected = scope.Database.Execute($"DELETE FROM {ContentLocks.TableName}");
                    
                    _logger.LogInformation("Deleted {RowsAffected} content locks via test API", rowsAffected);
                }

                _logger.LogInformation("Test API: Reset content locks - deleted {DeletedCount} locks", deletedCount);
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully reset content locks - deleted {deletedCount} locks",
                    deletedCount = deletedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting content locks via test API");
                return StatusCode(StatusCodes.Status500InternalServerError, new { 
                    success = false, 
                    message = "Error resetting content locks", 
                    error = ex.Message 
                });
            }
        }
    }
#endif
}