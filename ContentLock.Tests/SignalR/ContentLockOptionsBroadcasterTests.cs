using System.Runtime.CompilerServices;
using ContentLock.Interfaces;
using ContentLock.Options;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ContentLock.Tests.SignalR;

/// <summary>
/// Tests for <see cref="ContentLockOptionsBroadcaster"/> and the regression where
/// <see cref="ContentLockHub"/> subscribed to <see cref="IOptionsMonitor{T}.OnChange"/>
/// in its constructor, leaking every (transient) hub instance and broadcasting once per leaked hub.
/// These use a real <see cref="IOptionsMonitor{T}"/> backed by a reloadable configuration source.
/// </summary>
public class ContentLockOptionsBroadcasterTests
{
    private sealed class ReloadableConfigurationSource : IConfigurationSource
    {
        public ReloadableConfigurationProvider Provider { get; } = new();
        public IConfigurationProvider Build(IConfigurationBuilder builder) => Provider;
    }

    private sealed class ReloadableConfigurationProvider : ConfigurationProvider
    {
        public void Reload() => OnReload();
    }

    private static (IOptionsMonitor<ContentLockOptions> monitor, ReloadableConfigurationProvider provider) CreateOptionsMonitor()
    {
        var source = new ReloadableConfigurationSource();
        var config = new ConfigurationBuilder().Add(source).Build();

        var services = new ServiceCollection();
        services.AddOptions<ContentLockOptions>().Bind(config.GetSection(ContentLockOptions.ConfigName));

        var monitor = services.BuildServiceProvider().GetRequiredService<IOptionsMonitor<ContentLockOptions>>();
        return (monitor, source.Provider);
    }

    private static (ContentLockOptionsBroadcaster broadcaster, IContentLockHubEvents allClients) CreateBroadcaster(
        IOptionsMonitor<ContentLockOptions> monitor)
    {
        var allClients = Substitute.For<IContentLockHubEvents>();
        var hubContext = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        hubContext.Clients.All.Returns(allClients);

        var broadcaster = new ContentLockOptionsBroadcaster(
            monitor,
            hubContext,
            NullLogger<ContentLockOptionsBroadcaster>.Instance);

        return (broadcaster, allClients);
    }

    [Fact]
    public async Task OptionsChange_BroadcastsLatestOptionsToAllClientsOnce()
    {
        var (monitor, provider) = CreateOptionsMonitor();
        var (broadcaster, allClients) = CreateBroadcaster(monitor);
        await broadcaster.StartAsync(CancellationToken.None);

        provider.Reload();

        await allClients.Received(1).ReceiveLatestOptions(Arg.Any<ContentLockOptions>());
    }

    [Fact]
    public async Task StartAsync_CalledTwice_DoesNotSubscribeTwice()
    {
        var (monitor, provider) = CreateOptionsMonitor();
        var (broadcaster, allClients) = CreateBroadcaster(monitor);
        await broadcaster.StartAsync(CancellationToken.None);
        await broadcaster.StartAsync(CancellationToken.None);

        provider.Reload();

        await allClients.Received(1).ReceiveLatestOptions(Arg.Any<ContentLockOptions>());
    }

    [Fact]
    public async Task StopAsync_UnsubscribesFromOptionsChanges()
    {
        var (monitor, provider) = CreateOptionsMonitor();
        var (broadcaster, allClients) = CreateBroadcaster(monitor);
        await broadcaster.StartAsync(CancellationToken.None);
        await broadcaster.StopAsync(CancellationToken.None);

        provider.Reload();

        await allClients.DidNotReceive().ReceiveLatestOptions(Arg.Any<ContentLockOptions>());
    }

    [Fact]
    public async Task OptionsChange_WhenBroadcastThrows_DoesNotThrow()
    {
        var (monitor, provider) = CreateOptionsMonitor();
        var (broadcaster, allClients) = CreateBroadcaster(monitor);
        allClients
            .ReceiveLatestOptions(Arg.Any<ContentLockOptions>())
            .Returns(Task.FromException(new InvalidOperationException("Broadcast boom")));
        await broadcaster.StartAsync(CancellationToken.None);

        var act = () => provider.Reload();

        act.Should().NotThrow();
    }

    [Fact]
    public void ContentLockHub_IsNotKeptAliveByOptionsMonitor()
    {
        var (monitor, _) = CreateOptionsMonitor();

        var hubReferences = CreateHubs(monitor, count: 100);

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        hubReferences.Should().OnlyContain(r => !r.IsAlive);
    }

    // Creates hubs the way SignalR does (one per invocation) without holding strong references,
    // kept in a separate non-inlined method so the JIT does not extend their lifetime
    [MethodImpl(MethodImplOptions.NoInlining)]
    private static List<WeakReference> CreateHubs(IOptionsMonitor<ContentLockOptions> monitor, int count)
    {
        var references = new List<WeakReference>(count);
        for (var i = 0; i < count; i++)
        {
            var hub = new ContentLockHub(
                Substitute.For<IContentLockService>(),
                monitor,
                Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>(),
                Substitute.For<IEventAggregator>(),
                Substitute.For<IUserService>(),
                NullLogger<ContentLockHub>.Instance);

            references.Add(new WeakReference(hub));
            hub.Dispose();
        }
        return references;
    }
}
