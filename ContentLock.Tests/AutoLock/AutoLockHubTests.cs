using ContentLock.AutoLock;
using ContentLock.Interfaces;
using ContentLock.Options;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ContentLock.Tests.AutoLock;

/// <summary>
/// The Auto Lock hub methods only resolve the caller and delegate to <see cref="IAutoLockService"/>.
/// </summary>
public class AutoLockHubTests
{
    private readonly IAutoLockService _autoLockService = Substitute.For<IAutoLockService>();

    private ContentLockHub CreateHub(string connectionId)
    {
        var caller = Substitute.For<HubCallerContext>();
        caller.ConnectionId.Returns(connectionId);

        return new ContentLockHub(
            Substitute.For<IContentLockService>(),
            _autoLockService,
            Substitute.For<IOptionsMonitor<ContentLockOptions>>(),
            Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>(),
            Substitute.For<IEventAggregator>(),
            Substitute.For<IUserService>(),
            NullLogger<ContentLockHub>.Instance)
        {
            Context = caller,
            Clients = Substitute.For<IHubCallerClients<IContentLockHubEvents>>(),
        };
    }

    [Fact]
    public async Task AutoLockMethods_WithoutBackofficeUser_DoNothing()
    {
        var hub = CreateHub("c1");

        (await hub.AcquireAutoLockAsync(Guid.NewGuid())).Should().BeFalse();
        await hub.AutoLockHeartbeatAsync(Guid.NewGuid());
        await hub.ReleaseAutoLockAsync(Guid.NewGuid());

        _autoLockService.ReceivedCalls().Should().BeEmpty();
    }

    [Fact]
    public async Task OnDisconnected_ReleasesAutoLocksOfThatConnection()
    {
        await CreateHub("c1").OnDisconnectedAsync(null);

        await _autoLockService.Received(1).ReleaseConnectionAsync("c1");
    }
}
