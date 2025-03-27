using System.Globalization;

using Asp.Versioning;

using ContentLock.Extensions;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.SignalR;

using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

using Umbraco.Cms.Api.Common.Builders;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

using static Umbraco.Cms.Core.Collections.TopoGraph;

namespace ContentLock.Controllers
{
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "Content Lock")]
    public class ContentLockApiController : ContentLockApiControllerBase
    {
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IContentLockService _contentLockService;
        private readonly ILocalizedTextService _localizedTextService;
        private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _contentLockHubContext;

        public ContentLockApiController(
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IContentLockService contentLockService,
            ILocalizedTextService localizedTextService,
            IHubContext<ContentLockHub, IContentLockHubEvents> contentLockHubContext)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _contentLockService = contentLockService;
            _localizedTextService = localizedTextService;
            _contentLockHubContext = contentLockHubContext;
        }

        [HttpGet("Status/{key:guid}")]
        [ProducesResponseType<ContentLockStatus>(StatusCodes.Status200OK)]
        public async Task<ContentLockStatus> StatusAsync(Guid key)
        {
            var userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;
            var result = await _contentLockService.GetLockInfoAsync(key, userKey.Value);
            return result;
        }

        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [HttpGet("Lock/{key:guid}")]
        public async Task<IActionResult> LockContentAsync(Guid key)
        {
            var userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;
            var userLang = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Language ?? "en";
            var cultureInfo = new CultureInfo(userLang);
    
            // Get current info for lock
            var lockInfo = await _contentLockService.GetLockInfoAsync(key, userKey.Value);

            if(lockInfo.IsLocked && userKey != lockInfo.LockedByKey)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle(_localizedTextService.Localize("contentLockResponseTitles", "unauthorized", cultureInfo))
                    .WithDetail(_localizedTextService.Localize("contentLockResponseDetails", "contentAlreadyLocked", cultureInfo))
                    .Build());
            }

            // Perform lock
            var lockedContentInfo = await _contentLockService.LockContentAsync(key, userKey.Value);

            // Use SignalR to send out to ALL clients that node has been locked
            // Then the underlying observable object with the count & array can be updated
            await _contentLockHubContext.Clients.All.AddLockToClients(lockedContentInfo);

            return Ok($"Locked content with key {key}");
        }

        [HttpGet("Unlock/{key:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UnlockContentAsync(Guid key)
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            var userKey = currentUser?.Key;
            var userLang = currentUser?.Language ?? "en";
            var userName = currentUser?.Name ?? "Unknown person";
            var cultureInfo = new CultureInfo(userLang);

            // Get current info for lock
            var lockInfo = await _contentLockService.GetLockInfoAsync(key, userKey.Value);

            // Look for current user granular permissions
            var hasUnlockPermission = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.HasContentUnlockPermission();

            // Ensure the requesting user here is the same as the one who locked it
            if (userKey != lockInfo.LockedByKey && hasUnlockPermission is false)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle(_localizedTextService.Localize("contentLockResponseTitles", "unauthorized", cultureInfo))
                    .WithDetail(_localizedTextService.Localize("contentLockResponseDetails", "deniedUnlock", cultureInfo))
                    .Build());
            }

            await _contentLockService.UnlockContentAsync(key, userKey.Value);

            // Use SignalR to send out to ALL clients that a single node has been unlocked
            // Then the underlying observable object with the count & array can be updated
            await _contentLockHubContext.Clients.All.RemoveLockToClients(key);

            return Ok($"Unlocked content with key {key}");
        }

        [HttpGet("LockOverview")]
        [ProducesResponseType<ContentLockOverview>(StatusCodes.Status200OK)]
        public async Task<ContentLockOverview> LockOverviewAsync()
        {
            return await _contentLockService.GetLockOverviewAsync();
        }


        [HttpPost("BulkUnlock")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BulkUnlockAsync(IEnumerable<Guid> keys)
        {
            var hasUnlockPermission = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.HasContentUnlockPermission();
            var userLang = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Language ?? "en";
            var cultureInfo = new CultureInfo(userLang);

            // Only users with the 'ContentLock.Unlocker' permission can BULK unlock content
            if (hasUnlockPermission is false)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle(_localizedTextService.Localize("contentLockResponseTitles", "invalidPermission", cultureInfo))
                    .WithDetail(_localizedTextService.Localize("contentLockResponseDetails", "deniedBulkUnlock", cultureInfo))
                    .Build());
            }

            var userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;

            // For each item posted to bulk unlock
            foreach (var contentKey in keys)
            {
                // Call unlock on service
                await _contentLockService.UnlockContentAsync(contentKey, userKey.Value);
            }

            // Use SignalR to send out to ALL clients that many node/s has been unlocked
            // Then the underlying observable object with the count & array can be updated
            await _contentLockHubContext.Clients.All.RemoveLocksToClients(keys);

            return Ok();
        }
    }
}
