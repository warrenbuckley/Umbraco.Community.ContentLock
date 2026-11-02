using ContentLock.Options;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Umbraco.Cms.Core.Sync;
using Umbraco.Cms.Infrastructure.BackgroundJobs;

namespace ContentLock.AutoLock;

/// <summary>
/// Releases inactive auto-locks on its own timer, so a slow or hung Umbraco job cannot delay it.
/// In a load-balanced setup it runs on the elected scheduling publisher only.
/// </summary>
public class AutoLockInactivityJob : IRecurringBackgroundJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<ContentLockOptions> _options;

    public AutoLockInactivityJob(IServiceScopeFactory scopeFactory, IOptionsMonitor<ContentLockOptions> options)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _options.OnChange(_ => PeriodChanged?.Invoke(this, EventArgs.Empty));
    }

    public TimeSpan Period => TimeSpan.FromSeconds(_options.CurrentValue.AutoLock.InactivityCheckSeconds);

    public TimeSpan Delay => Period;

    public ServerRole[] ServerRoles => [ServerRole.Single, ServerRole.SchedulingPublisher];

    public event EventHandler? PeriodChanged;

    public async Task RunJobAsync()
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<IAutoLockService>()
            .ReleaseInactiveAsync(TimeSpan.FromSeconds(_options.CurrentValue.AutoLock.InactivityTimeoutSeconds));
    }
}
