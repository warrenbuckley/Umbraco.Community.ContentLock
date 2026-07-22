using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when a WebRTC call rings out unanswered.
/// </summary>
public sealed class CallMissedNotification : INotification
{
    public CallMissedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
    {
        CallerUserKey = callerUserKey;
        CallerUserName = callerUserName;
        CalleeUserKey = calleeUserKey;
        CalleeUserName = calleeUserName;
        Timestamp = DateTime.UtcNow;
    }

    public Guid CallerUserKey { get; }
    public string CallerUserName { get; }
    public Guid CalleeUserKey { get; }
    public string CalleeUserName { get; }
    public DateTime Timestamp { get; }
}
