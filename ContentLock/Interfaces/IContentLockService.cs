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
        Task<ContentLockOverviewItem> LockContentAsync(Guid contentKey, Guid userKey);

        /// <summary>
        /// Unlock a content node
        /// </summary>
        /// <param name="contentKey"></param>
        /// <param name="userKey"></param>
        Task UnlockContentAsync(Guid contentKey, Guid userKey);

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
        /// This will return all locked content keys
        /// Used in conjunction with FlagProvider to know if the 
        /// </summary>
        /// <returns>
        /// Only the returned list of keys are locked
        /// </returns>
        Task<IReadOnlySet<Guid>> GetLockedContentKeysAsync(IReadOnlySet<Guid> keys);
    }
}
