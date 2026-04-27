using Xunit;
using ContentLock.Controllers;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace ContentLock.Tests.Controllers;

/// <summary>
/// Unit tests for <see cref="ContentLockApiController"/>.
/// These tests validate authorization logic, permission checks, and SignalR broadcast calls
/// without spinning up a full ASP.NET Core host.
/// </summary>
public class ContentLockApiControllerTests
{
    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private static (
        ContentLockApiController controller,
        IContentLockService contentLockService,
        IContentLockHubEvents hubAllClients,
        IBackOfficeSecurityAccessor accessor
    ) CreateController(IUser user)
    {
        var contentLockService = Substitute.For<IContentLockService>();
        var localizedTextService = Substitute.For<ILocalizedTextService>();
        // Return a non-null string for any Localize call so ProblemDetailsBuilder doesn't receive nulls
        localizedTextService
            .Localize(default, default, default, default)
            .ReturnsForAnyArgs("Localized error message");

        var hubAllClients = Substitute.For<IContentLockHubEvents>();
        var hubClients = Substitute.For<IHubClients<IContentLockHubEvents>>();
        hubClients.All.Returns(hubAllClients);
        var hubContext = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        hubContext.Clients.Returns(hubClients);

        var backOfficeSecurity = Substitute.For<IBackOfficeSecurity>();
        backOfficeSecurity.CurrentUser.Returns(user);
        var accessor = Substitute.For<IBackOfficeSecurityAccessor>();
        accessor.BackOfficeSecurity.Returns(backOfficeSecurity);

        var controller = new ContentLockApiController(
            accessor,
            contentLockService,
            localizedTextService,
            hubContext);

        return (controller, contentLockService, hubAllClients, accessor);
    }

    /// <summary>Creates an <see cref="IUser"/> mock with the given key and optional groups.</summary>
    private static IUser CreateUser(Guid userKey, bool hasUnlockerPermission = false)
    {
        var user = Substitute.For<IUser>();
        user.Key.Returns(userKey);
        user.Language.Returns("en");

        var group = Substitute.For<IReadOnlyUserGroup>();
        group.Permissions.Returns(
            hasUnlockerPermission
                ? (ISet<string>)new HashSet<string> { Constants.Permission }
                : (ISet<string>)new HashSet<string>()
        );
        user.Groups.Returns(new[] { group });

        return user;
    }

    private static ContentLockStatus NotLocked() =>
        new() { IsLocked = false };

    private static ContentLockStatus LockedBy(Guid lockerKey) =>
        new() { IsLocked = true, LockedByKey = lockerKey };

    private static ContentLockOverviewItem SampleOverviewItem(Guid key, Guid lockedByKey) =>
        new()
        {
            Key = key,
            NodeName = "Home",
            ContentType = "home",
            CheckedOutBy = "Warren Buckley",
            CheckedOutByKey = lockedByKey,
        };

    // ──────────────────────────────────────────────────────────────────────────
    // LockContentAsync
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task LockContentAsync_WhenPageNotLocked_ReturnsOkAndBroadcasts()
    {
        var userKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var user = CreateUser(userKey);
        var (controller, service, hubAll, _) = CreateController(user);

        service.GetLockInfoAsync(contentKey, userKey).Returns(NotLocked());
        var overviewItem = SampleOverviewItem(contentKey, userKey);
        service.LockContentAsync(contentKey, userKey).Returns(overviewItem);

        var result = await controller.LockContentAsync(contentKey);

        result.Should().BeOfType<OkObjectResult>();
        await service.Received(1).LockContentAsync(contentKey, userKey);
        await hubAll.Received(1).AddLockToClients(overviewItem);
    }

    [Fact]
    public async Task LockContentAsync_WhenPageAlreadyLockedBySelf_ReturnsOkAndBroadcasts()
    {
        // Attempting to re-lock a page you already locked should succeed (idempotent in UI flow)
        var userKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var user = CreateUser(userKey);
        var (controller, service, hubAll, _) = CreateController(user);

        // Page is locked by the SAME user
        service.GetLockInfoAsync(contentKey, userKey).Returns(LockedBy(userKey));
        var overviewItem = SampleOverviewItem(contentKey, userKey);
        service.LockContentAsync(contentKey, userKey).Returns(overviewItem);

        var result = await controller.LockContentAsync(contentKey);

        result.Should().BeOfType<OkObjectResult>();
        await service.Received(1).LockContentAsync(contentKey, userKey);
    }

    [Fact]
    public async Task LockContentAsync_WhenPageAlreadyLockedByAnotherUser_ReturnsBadRequest()
    {
        var currentUserKey = Guid.NewGuid();
        var otherUserKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var user = CreateUser(currentUserKey);
        var (controller, service, hubAll, _) = CreateController(user);

        // Page is locked by a DIFFERENT user
        service.GetLockInfoAsync(contentKey, currentUserKey).Returns(LockedBy(otherUserKey));

        var result = await controller.LockContentAsync(contentKey);

        result.Should().BeOfType<BadRequestObjectResult>();
        await service.DidNotReceive().LockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await hubAll.DidNotReceive().AddLockToClients(Arg.Any<ContentLockOverviewItem>());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UnlockContentAsync
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UnlockContentAsync_WhenLockedBySelf_ReturnsOkAndBroadcasts()
    {
        var userKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var user = CreateUser(userKey, hasUnlockerPermission: false);
        var (controller, service, hubAll, _) = CreateController(user);

        service.GetLockInfoAsync(contentKey, userKey).Returns(LockedBy(userKey));

        var result = await controller.UnlockContentAsync(contentKey);

        result.Should().BeOfType<OkObjectResult>();
        await service.Received(1).UnlockContentAsync(contentKey, userKey);
        await hubAll.Received(1).RemoveLockToClients(contentKey);
    }

    [Fact]
    public async Task UnlockContentAsync_WhenLockedByOtherUser_WithoutPermission_ReturnsBadRequest()
    {
        var currentUserKey = Guid.NewGuid();
        var otherUserKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        var user = CreateUser(currentUserKey, hasUnlockerPermission: false);
        var (controller, service, hubAll, _) = CreateController(user);

        service.GetLockInfoAsync(contentKey, currentUserKey).Returns(LockedBy(otherUserKey));

        var result = await controller.UnlockContentAsync(contentKey);

        result.Should().BeOfType<BadRequestObjectResult>();
        await service.DidNotReceive().UnlockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await hubAll.DidNotReceive().RemoveLockToClients(Arg.Any<Guid>());
    }

    [Fact]
    public async Task UnlockContentAsync_WhenLockedByOtherUser_WithUnlockerPermission_ReturnsOk()
    {
        var currentUserKey = Guid.NewGuid();
        var otherUserKey = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        // Current user has the ContentLock.Unlocker granular permission
        var user = CreateUser(currentUserKey, hasUnlockerPermission: true);
        var (controller, service, hubAll, _) = CreateController(user);

        service.GetLockInfoAsync(contentKey, currentUserKey).Returns(LockedBy(otherUserKey));

        var result = await controller.UnlockContentAsync(contentKey);

        result.Should().BeOfType<OkObjectResult>();
        await service.Received(1).UnlockContentAsync(contentKey, currentUserKey);
        await hubAll.Received(1).RemoveLockToClients(contentKey);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BulkUnlockAsync
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task BulkUnlockAsync_WithoutUnlockerPermission_ReturnsBadRequest()
    {
        var userKey = Guid.NewGuid();
        var user = CreateUser(userKey, hasUnlockerPermission: false);
        var (controller, service, hubAll, _) = CreateController(user);

        var keys = new[] { Guid.NewGuid(), Guid.NewGuid() };

        var result = await controller.BulkUnlockAsync(keys);

        result.Should().BeOfType<BadRequestObjectResult>();
        await service.DidNotReceive().UnlockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await hubAll.DidNotReceive().RemoveLocksToClients(Arg.Any<IEnumerable<Guid>>());
    }

    [Fact]
    public async Task BulkUnlockAsync_WithUnlockerPermission_UnlocksAllAndBroadcasts()
    {
        var userKey = Guid.NewGuid();
        var user = CreateUser(userKey, hasUnlockerPermission: true);
        var (controller, service, hubAll, _) = CreateController(user);

        var keys = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };

        var result = await controller.BulkUnlockAsync(keys);

        result.Should().BeOfType<OkResult>();
        // Each key should be unlocked individually
        foreach (var key in keys)
        {
            await service.Received(1).UnlockContentAsync(key, userKey);
        }
        // A single broadcast for all keys
        await hubAll.Received(1).RemoveLocksToClients(Arg.Is<IEnumerable<Guid>>(k => k.SequenceEqual(keys)));
    }

    [Fact]
    public async Task BulkUnlockAsync_WithEmptyList_WithUnlockerPermission_ReturnsOkWithNoUnlocks()
    {
        var userKey = Guid.NewGuid();
        var user = CreateUser(userKey, hasUnlockerPermission: true);
        var (controller, service, hubAll, _) = CreateController(user);

        var result = await controller.BulkUnlockAsync(Enumerable.Empty<Guid>());

        result.Should().BeOfType<OkResult>();
        await service.DidNotReceive().UnlockContentAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
    }
}
