using ContentLock.Interfaces;
using ContentLock.Options;

using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ContentLock.SignalR;

/// <summary>
/// Pushes <see cref="ContentLockOptions"/> changes to all connected SignalR clients.
/// Subscribes to <see cref="IOptionsMonitor{T}.OnChange"/> exactly once for the lifetime of the app.
/// This must not live in <see cref="ContentLockHub"/>, as hubs are transient (one per invocation)
/// and each instance would add a listener to the singleton monitor that is never removed.
/// </summary>
public class ContentLockOptionsBroadcaster : IHostedService, IDisposable
{
    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _hubContext;
    private readonly ILogger<ContentLockOptionsBroadcaster> _logger;
    private IDisposable? _optionsChangeToken;

    public ContentLockOptionsBroadcaster(
        IOptionsMonitor<ContentLockOptions> options,
        IHubContext<ContentLockHub, IContentLockHubEvents> hubContext,
        ILogger<ContentLockOptionsBroadcaster> logger)
    {
        _options = options;
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _optionsChangeToken ??= _options.OnChange(options => _ = BroadcastAsync(options));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _optionsChangeToken?.Dispose();
        _optionsChangeToken = null;
    }

    private async Task BroadcastAsync(ContentLockOptions options)
    {
        try
        {
            // Notify all connected clients of the new options values
            await _hubContext.Clients.All.ReceiveLatestOptions(options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast updated ContentLock options to connected clients");
        }
    }
}
