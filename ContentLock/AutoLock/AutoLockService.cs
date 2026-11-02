using ContentLock.Interfaces;
using ContentLock.Options;
using ContentLock.SignalR;

using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ContentLock.AutoLock;

public class AutoLockService(
    IContentLockService contentLockService,
    IAutoLockRepository repository,
    IHubContext<ContentLockHub, IContentLockHubEvents> hubContext,
    IOptionsMonitor<ContentLockOptions> options,
    TimeProvider timeProvider,
    ILogger<AutoLockService> logger) : IAutoLockService
{
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;

    public async Task<bool> AcquireAsync(Guid contentKey, Guid userKey, string? connectionId)
    {
        if (options.CurrentValue.AutoLock.Enable is false)
        {
            return false;
        }

        var lockStatus = await contentLockService.GetLockInfoAsync(contentKey, userKey);
        if (lockStatus.IsLocked)
        {
            return false;
        }

        var lockInfo = await contentLockService.LockContentAsync(contentKey, userKey);
        await repository.MarkAutoLockAsync(contentKey, userKey, connectionId, UtcNow);
        await hubContext.Clients.All.AddLockToClients(lockInfo);
        return true;
    }

    public Task<bool> HeartbeatAsync(Guid contentKey, Guid userKey, string? connectionId)
        => repository.TouchAsync(contentKey, userKey, connectionId, UtcNow);

    public Task<bool> ReleaseAsync(Guid contentKey, Guid userKey) => ReleaseIfClaimedAsync(new(contentKey, userKey));

    public async Task ReleaseConnectionAsync(string connectionId)
    {
        foreach (var holder in await repository.GetByConnectionAsync(connectionId))
        {
            await ReleaseIfClaimedAsync(holder);
        }
    }

    public async Task<int> ReleaseInactiveAsync(TimeSpan inactivity)
    {
        var released = 0;
        foreach (var holder in await repository.GetInactiveAsync(UtcNow - inactivity))
        {
            if (await ReleaseIfClaimedAsync(holder))
            {
                released++;
            }
        }

        return released;
    }

    private async Task<bool> ReleaseIfClaimedAsync(AutoLockHolder holder)
    {
        if (await repository.TryClaimReleaseAsync(holder.ContentKey, holder.UserKey) is false)
        {
            return false;
        }

        try
        {
            await contentLockService.UnlockContentAsync(holder.ContentKey, holder.UserKey);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Releasing auto-lock on {ContentKey} for {UserKey} failed; it remains as a manual lock", holder.ContentKey, holder.UserKey);
            throw;
        }

        await hubContext.Clients.All.RemoveLockToClients(holder.ContentKey);
        return true;
    }
}
