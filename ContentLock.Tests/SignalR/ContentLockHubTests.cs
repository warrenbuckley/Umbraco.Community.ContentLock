using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.Options;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ContentLock.Tests.SignalR;

/// <summary>
/// Unit tests for the notification-publishing helpers on <see cref="ContentLockHub"/>.
/// These call the extracted `PublishXAsync` methods directly, so no SignalR
/// HubCallerContext/ClaimsPrincipal setup is required.
/// </summary>
public class ContentLockHubTests
{
    private static (
        ContentLockHub hub,
        IEventAggregator eventAggregator,
        IUserService userService
    ) CreateHub()
    {
        var contentLockService = Substitute.For<IContentLockService>();
        var options = Substitute.For<IOptionsMonitor<ContentLockOptions>>();
        var hubContext = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        var eventAggregator = Substitute.For<IEventAggregator>();
        var userService = Substitute.For<IUserService>();

        var hub = new ContentLockHub(
            contentLockService,
            options,
            hubContext,
            eventAggregator,
            userService,
            NullLogger<ContentLockHub>.Instance);

        return (hub, eventAggregator, userService);
    }

    [Fact]
    public async Task PublishCallInitiatedAsync_ResolvesCalleeNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var callee = Substitute.For<IUser>();
        callee.Name.Returns("Callee Name");
        userService.GetAsync(calleeKey).Returns(callee);

        await hub.PublishCallInitiatedAsync(callerKey, "Caller Name", calleeKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallInitiatedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallInitiatedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(calleeKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallInitiatedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallInitiatedAsync(callerKey, "Caller Name", calleeKey);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task PublishCallDeclinedAsync_ResolvesCallerNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var caller = Substitute.For<IUser>();
        caller.Name.Returns("Caller Name");
        userService.GetAsync(callerKey).Returns(caller);

        await hub.PublishCallDeclinedAsync(callerKey, calleeKey, "Callee Name");

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallDeclinedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallDeclinedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(callerKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallDeclinedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallDeclinedAsync(callerKey, calleeKey, "Callee Name");

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task PublishCallMissedAsync_ResolvesCalleeNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var callee = Substitute.For<IUser>();
        callee.Name.Returns("Callee Name");
        userService.GetAsync(calleeKey).Returns(callee);

        await hub.PublishCallMissedAsync(callerKey, "Caller Name", calleeKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallMissedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallMissedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(calleeKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallMissedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallMissedAsync(callerKey, "Caller Name", calleeKey);

        await act.Should().NotThrowAsync();
    }
}
