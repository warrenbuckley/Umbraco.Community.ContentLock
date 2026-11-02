namespace ContentLock.AutoLock;

public interface IAutoLockService
{
    Task<bool> AcquireAsync(Guid contentKey, Guid userKey, string? connectionId);

    Task<bool> HeartbeatAsync(Guid contentKey, Guid userKey, string? connectionId);

    /// <summary>Releases the auto-lock only when <paramref name="userKey"/> holds it; manual locks are never touched.</summary>
    Task<bool> ReleaseAsync(Guid contentKey, Guid userKey);

    Task ReleaseConnectionAsync(string connectionId);

    Task<int> ReleaseInactiveAsync(TimeSpan inactivity);
}
