using Asp.Versioning;
using ContentLock.Extensions;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Builders;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Controllers
{
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "Content Lock")]
    public class ContentLockApiController : ContentLockApiControllerBase
    {
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IContentLockService _contentLockService;

        public ContentLockApiController(IBackOfficeSecurityAccessor backOfficeSecurityAccessor, IContentLockService contentLockService)
        {
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _contentLockService = contentLockService;
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

            // Get current info for lock
            var lockInfo = await _contentLockService.GetLockInfoAsync(key, userKey.Value);

            if(lockInfo.IsLocked && userKey != lockInfo.LockedByKey)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle("Unauthorized")
                    .WithDetail("Someone else already has the piece of content locked and only the original user who locked this content can unlock it or a super user with the unlocking permission")
                    .Build());
            }

            await _contentLockService.LockContentAsync(key, userKey.Value);
            return Ok($"Locked content with key {key}");
        }

        [HttpGet("Unlock/{key:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UnlockContentAsync(Guid key)
        {
            var userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;

            // Get current info for lock
            var lockInfo = await _contentLockService.GetLockInfoAsync(key, userKey.Value);

            // Look for current user granular permissions
            var hasUnlockPermission = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.HasContentUnlockPermission();

            // Ensure the requesting user here is the same as the one who locked it
            if (userKey != lockInfo.LockedByKey && hasUnlockPermission is false)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle("Unauthorized")
                    .WithDetail("Only the original user who locked this content can unlock it or a super user with the unlocking permission")
                    .Build());
            }

            await _contentLockService.UnlockContentAsync(key, userKey.Value);
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

            // Only users with the 'ContentLock.Unlocker' permission can BULK unlock content
            if (hasUnlockPermission is false)
            {
                return BadRequest(new ProblemDetailsBuilder()
                    .WithTitle("Invalid permission")
                    .WithDetail("Only users with the Content Lock 'Unlocker' permission is allowed to perform a bulk unlock.")
                    .Build());
            }

            var userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;

            // For each item posted to bulk unlock
            foreach (var contentKey in keys)
            {
                // Call unlock on service
                await _contentLockService.UnlockContentAsync(contentKey, userKey.Value);
            }

            return Ok();
        }
    }
}
