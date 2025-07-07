using ContentLock.Models.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Routing;

namespace ContentLock.E2E.Controllers
{
    [ApiController]
    [BackOfficeRoute("contentlock-e2e/api")]
    [Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    public class TestController : ControllerBase
    {
        private readonly IScopeProvider _scopeProvider;

        public TestController(IScopeProvider scopeProvider)
        {
            _scopeProvider = scopeProvider;
        }

        [HttpGet("reset")]
        public async Task<IActionResult> ResetContentLocksAsync()
        {
            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    var result = await scope.Database.DeleteMany<ContentLocks>().ExecuteAsync();
                }
            }
            catch (Exception ex)
            {
                throw;
            }

            return Ok();
        }
    }
}
