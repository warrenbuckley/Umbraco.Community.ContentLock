using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published after a content node has been successfully unlocked.
/// </summary>
public sealed class ContentUnlockedNotification : INotification
{
    public ContentUnlockedNotification(Guid contentKey, Guid unlockedByUserKey, string unlockedByUserName)
    {
        ContentKey = contentKey;
        UnlockedByUserKey = unlockedByUserKey;
        UnlockedByUserName = unlockedByUserName;
    }

    public Guid ContentKey { get; }
    public Guid UnlockedByUserKey { get; }
    public string UnlockedByUserName { get; }
}
