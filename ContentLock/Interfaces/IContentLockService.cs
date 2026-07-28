using ContentLock.Models.Backoffice;

namespace ContentLock.Interfaces
{
    public interface IContentLockService
    {
        /// <summary>
        /// Lock a content node with a given user
        /// </summary>
        /// <param name="contentKey">The content node key to lock</param>
        /// <param name="userKey">The user key, requesting to lock the node</param>
        /// <param name="isAutoLock">True when the lock is created automatically on edit rather than by an explicit user action</param>
        Task<ContentLockOverviewItem> LockContentAsync(Guid contentKey, Guid userKey, bool isAutoLock = false);

        /// <summary>
        /// Unlock a content node
        /// </summary>
        /// <param name="contentKey"></param>
        /// <param name="userKey"></param>
        Task UnlockContentAsync(Guid contentKey, Guid userKey);

        /// <summary>
        /// Releases a lock only if it is an auto-lock held by the given user.
        /// Manual locks are never removed by this method.
        /// </summary>
        /// <returns>True if an auto-lock was removed; otherwise false.</returns>
        Task<bool> ReleaseAutoLockAsync(Guid contentKey, Guid userKey);

        /// <summary>
        /// Gets a status of a lock
        /// </summary>
        /// <param name="contentKey"></param>
        /// <param name="userKey"></param>
        /// <returns></returns>
        Task<ContentLockStatus> GetLockInfoAsync(Guid contentKey, Guid userKey);

        /// <summary>
        /// This is an overview of all content locks in place
        /// Used for the overview dashboard
        /// </summary>
        Task<ContentLockOverview> GetLockOverviewAsync();

        /// <summary>
        /// Returns the subset of the provided content keys that are currently locked.
        /// Used in conjunction with FlagProvider to determine which content nodes are locked.
        /// </summary>
        /// <param name="keys">A set of content node keys to check for lock status.</param>
        /// <returns>
        /// Only the returned list of keys are locked.
        /// </returns>
        Task<IReadOnlySet<Guid>> GetLockedContentKeysAsync(IReadOnlySet<Guid> keys);
    }
}
