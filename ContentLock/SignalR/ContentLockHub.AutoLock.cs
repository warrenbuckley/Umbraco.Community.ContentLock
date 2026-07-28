using System.Collections.Concurrent;

using Umbraco.Cms.Core.Collections;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

public partial class ContentLockHub
{
    private static readonly ConcurrentDictionary<string, ConcurrentHashSet<Guid>> AutoLocksByConnection = new();

    private static readonly ConcurrentDictionary<Guid, AutoLockTimeout> AutoLockTimeouts = new();

    private sealed record AutoLockTimeout(string ConnectionId, Guid UserKey, CancellationTokenSource Cts);

    public async Task AcquireAutoLock(Guid contentKey)
    {
        if (!_options.CurrentValue.AutoLock.Enable)
        {
            return;
        }

        var userKey = this.Context.User?.GetUmbracoIdentity()?.GetUserKey();
        if (!userKey.HasValue)
        {
            return;
        }

        var lockInfo = await _contentLockService.GetLockInfoAsync(contentKey, userKey.Value);
        if (lockInfo.IsLocked)
        {
            return;
        }

        var lockedContentInfo = await _contentLockService.LockContentAsync(contentKey, userKey.Value, isAutoLock: true);

        AutoLocksByConnection.GetOrAdd(this.Context.ConnectionId, _ => new ConcurrentHashSet<Guid>()).TryAdd(contentKey);
        StartAutoLockTimeout(contentKey, this.Context.ConnectionId, userKey.Value);

        await Clients.All.AddLockToClients(lockedContentInfo);
    }

    public async Task ReleaseAutoLock(Guid contentKey)
    {
        var userKey = this.Context.User?.GetUmbracoIdentity()?.GetUserKey();
        if (!userKey.HasValue)
        {
            return;
        }

        if (!AutoLocksByConnection.TryGetValue(this.Context.ConnectionId, out var keys) || !keys.Contains(contentKey))
        {
            return;
        }

        CancelAutoLockTimeout(contentKey);
        keys.Remove(contentKey);

        if (await _contentLockService.ReleaseAutoLockAsync(contentKey, userKey.Value))
        {
            await Clients.All.RemoveLockToClients(contentKey);
        }
    }

    public Task AutoLockHeartbeat(Guid contentKey)
    {
        if (AutoLockTimeouts.TryGetValue(contentKey, out var entry) && entry.ConnectionId == this.Context.ConnectionId)
        {
            StartAutoLockTimeout(contentKey, entry.ConnectionId, entry.UserKey);
        }

        return Task.CompletedTask;
    }

    private async Task CleanUpAutoLocksOnDisconnectAsync(Guid? userKey, string connectionId)
    {
        if (!userKey.HasValue || !AutoLocksByConnection.TryRemove(connectionId, out var keys))
        {
            return;
        }

        foreach (var contentKey in keys.ToArray())
        {
            CancelAutoLockTimeout(contentKey);

            if (await _contentLockService.ReleaseAutoLockAsync(contentKey, userKey.Value))
            {
                await Clients.All.RemoveLockToClients(contentKey);
            }
        }
    }

    private void StartAutoLockTimeout(Guid contentKey, string connectionId, Guid userKey)
    {
        CancelAutoLockTimeout(contentKey);

        var cts = new CancellationTokenSource();
        AutoLockTimeouts[contentKey] = new AutoLockTimeout(connectionId, userKey, cts);
        _ = HandleAutoLockTimeoutAsync(contentKey, connectionId, userKey, cts.Token);
    }

    private async Task HandleAutoLockTimeoutAsync(Guid contentKey, string connectionId, Guid userKey, CancellationToken ct)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(_options.CurrentValue.AutoLock.InactivityTimeoutSeconds), ct);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        AutoLockTimeouts.TryRemove(contentKey, out _);
        if (AutoLocksByConnection.TryGetValue(connectionId, out var keys))
        {
            keys.Remove(contentKey);
        }

        if (await _contentLockService.ReleaseAutoLockAsync(contentKey, userKey))
        {
            await _hubContext.Clients.All.RemoveLockToClients(contentKey);
        }
    }

    private static void CancelAutoLockTimeout(Guid contentKey)
    {
        if (AutoLockTimeouts.TryRemove(contentKey, out var entry))
        {
            entry.Cts.Cancel();
            entry.Cts.Dispose();
        }
    }
}
