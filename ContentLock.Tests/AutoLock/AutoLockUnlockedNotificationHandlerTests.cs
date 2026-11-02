using ContentLock.AutoLock;
using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.SignalR;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using Xunit;

namespace ContentLock.Tests.AutoLock;

public class AutoLockUnlockedNotificationHandlerTests
{
    [Fact]
    public async Task Unlocked_TellsClientsWhoUnlocked()
    {
        var contentKey = Guid.NewGuid();
        var adminKey = Guid.NewGuid();
        var hub = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();

        await new AutoLockUnlockedNotificationHandler(hub)
            .HandleAsync(new ContentUnlockedNotification(contentKey, adminKey, "Admin"), CancellationToken.None);

        await hub.Clients.All.Received(1).ReceiveLockUnlockedByUser(contentKey, "Admin", adminKey);
    }
}
