using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when the callee explicitly declines an incoming WebRTC call.
/// </summary>
public sealed class CallDeclinedNotification : INotification
{
    public CallDeclinedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
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
