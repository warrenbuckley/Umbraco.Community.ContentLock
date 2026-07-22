using ContentLock.Models.Backoffice;

using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published after a content node has been successfully locked.
/// </summary>
public sealed class ContentLockedNotification : INotification
{
    public ContentLockedNotification(ContentLockOverviewItem lockItem)
    {
        LockItem = lockItem;
    }

    public ContentLockOverviewItem LockItem { get; }
}
