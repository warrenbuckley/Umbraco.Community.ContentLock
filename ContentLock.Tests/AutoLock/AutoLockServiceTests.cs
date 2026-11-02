using ContentLock.AutoLock;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Options;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace ContentLock.Tests.AutoLock;

public class AutoLockServiceTests
{
    private static readonly Guid Content = Guid.NewGuid();
    private static readonly Guid Editor = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private readonly IContentLockService _locks = Substitute.For<IContentLockService>();
    private readonly IAutoLockRepository _repo = Substitute.For<IAutoLockRepository>();
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _hub = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
    private static readonly DateTimeOffset FixedNow = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);
    private readonly TimeProvider _time = Substitute.For<TimeProvider>();
    private readonly ContentLockOptions _options = new() { AutoLock = { Enable = true } };

    private static DateTime Now => FixedNow.UtcDateTime;

    public AutoLockServiceTests() => _time.GetUtcNow().Returns(FixedNow);

    private AutoLockService CreateService()
    {
        var monitor = Substitute.For<IOptionsMonitor<ContentLockOptions>>();
        monitor.CurrentValue.Returns(_ => _options);
        return new AutoLockService(_locks, _repo, _hub, monitor, _time, NullLogger<AutoLockService>.Instance);
    }

    [Fact]
    public async Task Acquire_WhenUnlocked_LocksMarksAndBroadcasts()
    {
        _locks.GetLockInfoAsync(Content, Editor).Returns(new ContentLockStatus { IsLocked = false });
        var lockInfo = new ContentLockOverviewItem { Key = Content, NodeName = "Home", ContentType = "home", CheckedOutBy = "Editor", CheckedOutByKey = Editor };
        _locks.LockContentAsync(Content, Editor).Returns(lockInfo);

        (await CreateService().AcquireAsync(Content, Editor, "c1")).Should().BeTrue();

        Received.InOrder(() =>
        {
            _locks.LockContentAsync(Content, Editor);
            _repo.MarkAutoLockAsync(Content, Editor, "c1", Now);
            _hub.Clients.All.AddLockToClients(lockInfo);
        });
    }

    [Fact]
    public async Task Acquire_WhenAlreadyLocked_DoesNothing()
    {
        _locks.GetLockInfoAsync(Content, Editor).Returns(new ContentLockStatus { IsLocked = true, LockedByKey = Other });

        (await CreateService().AcquireAsync(Content, Editor, "c1")).Should().BeFalse();

        await _locks.DidNotReceiveWithAnyArgs().LockContentAsync(default, default);
        await _repo.DidNotReceiveWithAnyArgs().MarkAutoLockAsync(default, default, default, default);
    }

    [Fact]
    public async Task Acquire_WhenDisabled_DoesNothing()
    {
        _options.AutoLock.Enable = false;

        (await CreateService().AcquireAsync(Content, Editor, "c1")).Should().BeFalse();

        await _locks.DidNotReceiveWithAnyArgs().GetLockInfoAsync(default, default);
    }

    [Fact]
    public async Task Heartbeat_RebindsConnection()
    {
        _repo.TouchAsync(Content, Editor, "c2", Now).Returns(true);

        (await CreateService().HeartbeatAsync(Content, Editor, "c2")).Should().BeTrue();
    }

    [Fact]
    public async Task Release_OwnAutoLock_ClaimsUnlocksBroadcasts()
    {
        _repo.TryClaimReleaseAsync(Content, Editor).Returns(true);

        (await CreateService().ReleaseAsync(Content, Editor)).Should().BeTrue();

        Received.InOrder(() =>
        {
            _repo.TryClaimReleaseAsync(Content, Editor);
            _locks.UnlockContentAsync(Content, Editor);
            _hub.Clients.All.RemoveLockToClients(Content);
        });
    }

    // Covers a manual (re)lock, another server releasing first, and another user calling release
    [Fact]
    public async Task Release_WhenClaimLost_DoesNothing()
    {
        _repo.TryClaimReleaseAsync(Content, Editor).Returns(false);

        (await CreateService().ReleaseAsync(Content, Editor)).Should().BeFalse();

        await _locks.DidNotReceiveWithAnyArgs().UnlockContentAsync(default, default);
        await _hub.Clients.All.DidNotReceiveWithAnyArgs().RemoveLockToClients(default);
    }

    [Fact]
    public async Task Release_WhenDisabledMeanwhile_StillReleases()
    {
        _options.AutoLock.Enable = false;
        _repo.TryClaimReleaseAsync(Content, Editor).Returns(true);

        (await CreateService().ReleaseAsync(Content, Editor)).Should().BeTrue();
    }

    [Fact]
    public async Task ReleaseConnection_ReleasesHoldersOfThatConnection()
    {
        var second = Guid.NewGuid();
        _repo.GetByConnectionAsync("c1").Returns([new(Content, Editor), new(second, Editor)]);
        _repo.TryClaimReleaseAsync(Arg.Any<Guid>(), Editor).Returns(true);

        await CreateService().ReleaseConnectionAsync("c1");

        await _locks.Received().UnlockContentAsync(Content, Editor);
        await _locks.Received().UnlockContentAsync(second, Editor);
    }

    [Fact]
    public async Task ReleaseInactive_UsesCutoffAndCountsClaimed()
    {
        var lostRace = Guid.NewGuid();
        _repo.GetInactiveAsync(Now.AddSeconds(-300)).Returns([new(Content, Editor), new(lostRace, Editor)]);
        _repo.TryClaimReleaseAsync(Content, Editor).Returns(true);
        _repo.TryClaimReleaseAsync(lostRace, Editor).Returns(false);

        (await CreateService().ReleaseInactiveAsync(TimeSpan.FromSeconds(300))).Should().Be(1);

        await _locks.DidNotReceive().UnlockContentAsync(lostRace, Arg.Any<Guid>());
    }

    [Fact]
    public async Task Release_WhenUnlockThrows_Rethrows()
    {
        _repo.TryClaimReleaseAsync(Content, Editor).Returns(true);
        _locks.UnlockContentAsync(Content, Editor).ThrowsAsync(new InvalidOperationException("db down"));

        var act = () => CreateService().ReleaseAsync(Content, Editor);

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _hub.Clients.All.DidNotReceiveWithAnyArgs().RemoveLockToClients(default);
    }
}
