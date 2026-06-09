using ContentLock.Interfaces;
using ContentLock.SignalR;

using Microsoft.AspNetCore.SignalR;

using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Notifications;

public class ContentSavedNotificationHandler : INotificationAsyncHandler<ContentSavedNotification>
{
    private readonly IContentLockService _contentLockService;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _contentLockHubContext;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public ContentSavedNotificationHandler(
        IContentLockService contentLockService,
        IHubContext<ContentLockHub, IContentLockHubEvents> contentLockHubContext,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _contentLockService = contentLockService;
        _contentLockHubContext = contentLockHubContext;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    public async Task HandleAsync(ContentSavedNotification notification, CancellationToken cancellationToken)
    {
        var savedKeys = notification.SavedEntities.Select(x => x.Key).ToHashSet();
        var lockedKeys = await _contentLockService.GetLockedContentKeysAsync(savedKeys);
        if (lockedKeys.Count == 0)
        {
            return;
        }

        // The editor who saved is the lock holder; other users viewing the node are prompted to reload (and skip this user)
        var changedByKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key ?? Umbraco.Cms.Core.Constants.Security.SuperUserKey;
        foreach (var contentKey in lockedKeys)
        {
            await _contentLockHubContext.Clients.All.ReceiveSuggestReload(contentKey, changedByKey);
        }
    }
}
