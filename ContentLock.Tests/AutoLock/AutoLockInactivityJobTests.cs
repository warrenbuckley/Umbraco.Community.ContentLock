using ContentLock.AutoLock;
using ContentLock.Options;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NSubstitute;
using Umbraco.Cms.Core.Sync;
using Xunit;

namespace ContentLock.Tests.AutoLock;

public class AutoLockInactivityJobTests
{
    private readonly IAutoLockService _service = Substitute.For<IAutoLockService>();
    private readonly IOptionsMonitor<ContentLockOptions> _monitor = Substitute.For<IOptionsMonitor<ContentLockOptions>>();
    private Action<ContentLockOptions, string?>? _onChange;

    public AutoLockInactivityJobTests() => _monitor.OnChange(Arg.Do<Action<ContentLockOptions, string?>>(listener => _onChange = listener));

    private AutoLockInactivityJob CreateJob(ContentLockOptions options)
    {
        _monitor.CurrentValue.Returns(options);
        var provider = new ServiceCollection().AddSingleton(_service).BuildServiceProvider();
        return new AutoLockInactivityJob(provider.GetRequiredService<IServiceScopeFactory>(), _monitor);
    }

    [Fact]
    public async Task Run_ReleasesUsingConfiguredTimeout()
    {
        await CreateJob(new ContentLockOptions { AutoLock = { InactivityTimeoutSeconds = 120 } }).RunJobAsync();

        await _service.Received(1).ReleaseInactiveAsync(TimeSpan.FromSeconds(120));
    }

    [Fact]
    public void Period_ComesFromOptions()
        => CreateJob(new ContentLockOptions { AutoLock = { InactivityCheckSeconds = 30 } }).Period.Should().Be(TimeSpan.FromSeconds(30));

    // One server at a time: Umbraco elects the scheduling publisher in a load-balanced setup
    [Fact]
    public void RunsOnSingleOrSchedulingPublisherOnly()
        => CreateJob(new ContentLockOptions()).ServerRoles.Should().BeEquivalentTo([ServerRole.Single, ServerRole.SchedulingPublisher]);

    [Fact]
    public void OptionsChange_RaisesPeriodChanged()
    {
        var job = CreateJob(new ContentLockOptions());
        var raised = false;
        job.PeriodChanged += (_, _) => raised = true;

        _onChange!(new ContentLockOptions { AutoLock = { InactivityCheckSeconds = 30 } }, null);

        raised.Should().BeTrue();
    }
}
