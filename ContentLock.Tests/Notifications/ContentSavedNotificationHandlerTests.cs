using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.SignalR;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Xunit;

namespace ContentLock.Tests.Notifications;

public class ContentSavedNotificationHandlerTests
{
    private static IContent Content(Guid key)
    {
        var content = Substitute.For<IContent>();
        content.Key.Returns(key);
        return content;
    }

    [Fact]
    public async Task Saved_LockedNode_SuggestsReloadWithSaver()
    {
        var lockedKey = Guid.NewGuid();
        var unlockedKey = Guid.NewGuid();
        var saverKey = Guid.NewGuid();

        var locks = Substitute.For<IContentLockService>();
        locks.GetLockedContentKeysAsync(Arg.Any<IReadOnlySet<Guid>>()).Returns(new HashSet<Guid> { lockedKey });
        var hub = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        var security = Substitute.For<IBackOfficeSecurityAccessor>();
        security.BackOfficeSecurity!.CurrentUser!.Key.Returns(saverKey);

        var notification = new ContentSavedNotification([Content(lockedKey), Content(unlockedKey)], new EventMessages());

        await new ContentSavedNotificationHandler(locks, hub, security).HandleAsync(notification, CancellationToken.None);

        await hub.Clients.All.Received(1).ReceiveSuggestReload(lockedKey, saverKey);
        await hub.Clients.All.DidNotReceive().ReceiveSuggestReload(unlockedKey, Arg.Any<Guid>());
    }

    [Fact]
    public async Task Saved_NothingLocked_SendsNothing()
    {
        var locks = Substitute.For<IContentLockService>();
        locks.GetLockedContentKeysAsync(Arg.Any<IReadOnlySet<Guid>>()).Returns(new HashSet<Guid>());
        var hub = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();

        await new ContentSavedNotificationHandler(locks, hub, Substitute.For<IBackOfficeSecurityAccessor>())
            .HandleAsync(new ContentSavedNotification([Content(Guid.NewGuid())], new EventMessages()), CancellationToken.None);

        await hub.Clients.All.DidNotReceiveWithAnyArgs().ReceiveSuggestReload(default, default);
    }
}
