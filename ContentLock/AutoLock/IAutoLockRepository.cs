namespace ContentLock.AutoLock;

public sealed record AutoLockHolder(Guid ContentKey, Guid UserKey);

/// <summary>
/// Auto-lock state lives on the ContentLocks row so every server in a load-balanced setup sees the same data.
/// </summary>
public interface IAutoLockRepository
{
    Task MarkAutoLockAsync(Guid contentKey, Guid userKey, string? connectionId, DateTime utcNow);

    /// <returns>True when the user still holds the auto-lock.</returns>
    Task<bool> TouchAsync(Guid contentKey, Guid userKey, string? connectionId, DateTime utcNow);

    /// <summary>Atomically turns the auto-lock into a plain lock; only the caller that succeeds may unlock it.</summary>
    Task<bool> TryClaimReleaseAsync(Guid contentKey, Guid userKey);

    Task<IReadOnlyList<AutoLockHolder>> GetByConnectionAsync(string connectionId);

    Task<IReadOnlyList<AutoLockHolder>> GetInactiveAsync(DateTime cutoffUtc);
}
