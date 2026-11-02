using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.SignalR;

using Microsoft.AspNetCore.SignalR;

using Umbraco.Cms.Core.Events;

namespace ContentLock.AutoLock;

/// <summary>
/// Tells clients who removed a lock, so a user holding an auto-lock on it can be warned.
/// Clients ignore events where they are the unlocker themselves (save, leave, inactivity, disconnect).
/// </summary>
public class AutoLockUnlockedNotificationHandler(IHubContext<ContentLockHub, IContentLockHubEvents> hubContext)
    : INotificationAsyncHandler<ContentUnlockedNotification>
{
    public Task HandleAsync(ContentUnlockedNotification notification, CancellationToken cancellationToken)
        => hubContext.Clients.All.ReceiveLockUnlockedByUser(notification.ContentKey, notification.UnlockedByUserName, notification.UnlockedByUserKey);
}
