using ContentLock.Interfaces;
using ContentLock.Models.Database;
using ContentLock.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Routing;

namespace ContentLock.E2E.Controllers
{
    [ApiController]
    [BackOfficeRoute("contentlock-e2e/api")]
    [AllowAnonymous] // E2E-only endpoint — no auth needed; not shipped in the main package
    public class TestController : ControllerBase
    {
        private readonly IScopeProvider _scopeProvider;
        private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _contentLockHubContext;

        public TestController(IScopeProvider scopeProvider,
             IHubContext<ContentLockHub, IContentLockHubEvents> contentLockHubContext)
        {
            _scopeProvider = scopeProvider;
            _contentLockHubContext = contentLockHubContext;
        }

        [HttpGet("reset")]
        public async Task<IActionResult> ResetContentLocksAsync()
        {
            using (var scope = _scopeProvider.CreateScope(autoComplete: true))
            {
                await scope.Database.DeleteMany<ContentLocks>().ExecuteAsync();
            }

            // Use SignalR to send out to ALL clients so they can remove all locks
            // Then the underlying observable object with the count & array can be updated
            await _contentLockHubContext.Clients.All.RemoveAllLocksToClients();

            return Ok();
        }
    }
}
