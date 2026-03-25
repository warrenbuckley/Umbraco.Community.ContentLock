using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Notifications;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Tests.Notifications;

/// <summary>
/// Unit tests for <see cref="ContentDeletingNotificationHandler"/>.
/// Verifies that locked content is handled correctly when deletion is attempted:
/// - If locked by the deleting user → auto-unlock and allow deletion
/// - If locked by a different user → cancel the notification and do not unlock
/// - If not locked → pass through with no side effects
/// </summary>
public class ContentDeletingNotificationHandlerTests
{
    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private static (
        ContentDeletingNotificationHandler handler,
        IContentLockService contentLockService,
        IContentLockHubEvents hubAllClients
    ) CreateHandler(Guid currentUserKey)
    {
        var contentLockService = Substitute.For<IContentLockService>();

        var hubAllClients = Substitute.For<IContentLockHubEvents>();
        var hubClients = Substitute.For<IHubClients<IContentLockHubEvents>>();
        hubClients.All.Returns(hubAllClients);
        var hubContext = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        hubContext.Clients.Returns(hubClients);

        var user = Substitute.For<IUser>();
        user.Key.Returns(currentUserKey);

        var backOfficeSecurity = Substitute.For<IBackOfficeSecurity>();
        backOfficeSecurity.CurrentUser.Returns(user);
        var accessor = Substitute.For<IBackOfficeSecurityAccessor>();
        accessor.BackOfficeSecurity.Returns(backOfficeSecurity);

        var handler = new ContentDeletingNotificationHandler(
            contentLockService,
            hubContext,
            accessor,
            NullLogger<ContentMovingToRecycleBinHandler>.Instance);

        return (handler, contentLockService, hubAllClients);
    }

    private static IContent CreateContentItem(Guid key)
    {
        var content = Substitute.For<IContent>();
        content.Key.Returns(key);
        return content;
    }

    private static ContentDeletingNotification CreateNotification(params IContent[] items)
    {
        // ContentDeletingNotification stores deleted entities in DeletedEntities
        var notification = new ContentDeletingNotification(items, new EventMessages());
        return notification;
    }

    private static ContentLockOverview EmptyOverview() =>
        new() { TotalResults = 0, Items = [] };

    private static ContentLockOverview OverviewWithLock(Guid contentKey, Guid lockedByUserKey) =>
        new()
        {
            TotalResults = 1,
            Items =
            [
                new ContentLockOverviewItem
                {
                    Key = contentKey,
                    NodeName = "Home",
                    ContentType = "home",
                    CheckedOutBy = "Some User",
                    CheckedOutByKey = lockedByUserKey,
                }
            ]
        };

    // ──────────────────────────────────────────────────────────────────────────
    // Tests
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_WhenNoLocksExist_AllowsDeletion()
    {
        var userKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var (handler, service, hubAll) = CreateHandler(userKey);

        service.GetLockOverviewAsync().Returns(EmptyOverview());

        var notification = CreateNotification(CreateContentItem(contentKey));
        await handler.HandleAsync(notification, CancellationToken.None);

        notification.Cancel.Should().BeFalse();
        await service.DidNotReceive().UnlockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await hubAll.DidNotReceive().RemoveLocksToClients(Arg.Any<IEnumerable<Guid>>());
    }

    [Fact]
    public async Task HandleAsync_WhenItemLockedBySelf_UnlocksAndAllowsDeletion()
    {
        var userKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var (handler, service, hubAll) = CreateHandler(userKey);

        // The item being deleted is locked by the SAME user doing the deleting
        service.GetLockOverviewAsync().Returns(OverviewWithLock(contentKey, lockedByUserKey: userKey));

        var notification = CreateNotification(CreateContentItem(contentKey));
        await handler.HandleAsync(notification, CancellationToken.None);

        // Deletion is allowed (not cancelled)
        notification.Cancel.Should().BeFalse();

        // The lock is removed before deletion proceeds
        await service.Received(1).UnlockContentAsync(contentKey, userKey);

        // All clients are notified of the unlock
        await hubAll.Received(1).RemoveLocksToClients(
            Arg.Is<IEnumerable<Guid>>(keys => keys.Contains(contentKey)));
    }

    [Fact]
    public async Task HandleAsync_WhenItemLockedByAnotherUser_CancelsNotification()
    {
        var currentUserKey = Guid.NewGuid();
        var otherUserKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var (handler, service, hubAll) = CreateHandler(currentUserKey);

        // The item is locked by a DIFFERENT user
        service.GetLockOverviewAsync().Returns(OverviewWithLock(contentKey, lockedByUserKey: otherUserKey));

        var notification = CreateNotification(CreateContentItem(contentKey));
        await handler.HandleAsync(notification, CancellationToken.None);

        // The deletion must be cancelled
        notification.Cancel.Should().BeTrue();

        // An error message must be appended to the notification
        notification.Messages.Should().ContainSingle(m => m.MessageType == EventMessageType.Error);

        // The lock must NOT be removed
        await service.DidNotReceive().UnlockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await hubAll.DidNotReceive().RemoveLocksToClients(Arg.Any<IEnumerable<Guid>>());
    }

    [Fact]
    public async Task HandleAsync_WhenDeletingMultipleItems_OnlyLockedOnesAreProcessed()
    {
        var userKey = Guid.NewGuid();
        var lockedKey = Guid.NewGuid();
        var unlockedKey = Guid.NewGuid();
        var (handler, service, hubAll) = CreateHandler(userKey);

        // Only one of the two items is locked (by the current user)
        service.GetLockOverviewAsync().Returns(OverviewWithLock(lockedKey, lockedByUserKey: userKey));

        var notification = CreateNotification(
            CreateContentItem(lockedKey),
            CreateContentItem(unlockedKey));
        await handler.HandleAsync(notification, CancellationToken.None);

        notification.Cancel.Should().BeFalse();
        await service.Received(1).UnlockContentAsync(lockedKey, userKey);
        await service.DidNotReceive().UnlockContentAsync(unlockedKey, Arg.Any<Guid>());
    }

    [Fact]
    public async Task HandleAsync_WhenMultipleItems_OneMixedLock_CancelsForLockedByOtherButUnlocksOwn()
    {
        var userKey = Guid.NewGuid();
        var otherUserKey = Guid.NewGuid();
        var ownLockedKey = Guid.NewGuid();
        var otherLockedKey = Guid.NewGuid();
        var (handler, service, hubAll) = CreateHandler(userKey);

        service.GetLockOverviewAsync().Returns(new ContentLockOverview
        {
            TotalResults = 2,
            Items =
            [
                new ContentLockOverviewItem
                {
                    Key = ownLockedKey,
                    NodeName = "Own Page",
                    ContentType = "page",
                    CheckedOutBy = "Current User",
                    CheckedOutByKey = userKey,
                },
                new ContentLockOverviewItem
                {
                    Key = otherLockedKey,
                    NodeName = "Other Page",
                    ContentType = "page",
                    CheckedOutBy = "Other User",
                    CheckedOutByKey = otherUserKey,
                },
            ]
        });

        var notification = CreateNotification(
            CreateContentItem(ownLockedKey),
            CreateContentItem(otherLockedKey));
        await handler.HandleAsync(notification, CancellationToken.None);

        // Cancelled because one item is locked by another user
        notification.Cancel.Should().BeTrue();

        // Own lock is released even though the overall operation is cancelled
        await service.Received(1).UnlockContentAsync(ownLockedKey, userKey);
        await service.DidNotReceive().UnlockContentAsync(otherLockedKey, Arg.Any<Guid>());
    }
}
