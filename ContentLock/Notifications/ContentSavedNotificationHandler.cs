using ContentLock.Interfaces;
using ContentLock.SignalR;

using Microsoft.AspNetCore.SignalR;

using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Notifications;

/// <summary>
/// Suggests other viewers reload a locked node only when it was actually saved, not on every unlock.
/// </summary>
public class ContentSavedNotificationHandler(
    IContentLockService contentLockService,
    IHubContext<ContentLockHub, IContentLockHubEvents> contentLockHubContext,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : INotificationAsyncHandler<ContentSavedNotification>
{
    public async Task HandleAsync(ContentSavedNotification notification, CancellationToken cancellationToken)
    {
        var savedKeys = notification.SavedEntities.Select(x => x.Key).ToHashSet();
        var lockedKeys = await contentLockService.GetLockedContentKeysAsync(savedKeys);
        if (lockedKeys.Count == 0)
        {
            return;
        }

        // The editor who saved is the lock holder; their own client skips the prompt
        var changedByKey = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key ?? Umbraco.Cms.Core.Constants.Security.SuperUserKey;
        foreach (var contentKey in lockedKeys)
        {
            await contentLockHubContext.Clients.All.ReceiveSuggestReload(contentKey, changedByKey);
        }
    }
}
