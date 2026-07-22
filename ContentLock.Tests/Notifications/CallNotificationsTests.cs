using ContentLock.Notifications;
using FluentAssertions;
using Xunit;

namespace ContentLock.Tests.Notifications;

public class CallNotificationsTests
{
    [Fact]
    public void CallInitiatedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallInitiatedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
        notification.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void CallDeclinedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallDeclinedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }

    [Fact]
    public void CallMissedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallMissedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }

    [Fact]
    public void CallEndedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallEndedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }
}
