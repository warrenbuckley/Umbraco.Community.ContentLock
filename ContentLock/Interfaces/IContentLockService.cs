using ContentLock.Models.Backoffice;

namespace ContentLock.Interfaces
{
    public interface IContentLockService
    {
        /// <summary>
        /// Lock a content node with a given user
        /// </summary>
        /// <param name="key">The content node key to lock</param>
        /// <param name="userKey">The user key, requesting to lock the node</param>
        Task LockContentAsync(Guid contentKey, Guid userKey);

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
    }
}
