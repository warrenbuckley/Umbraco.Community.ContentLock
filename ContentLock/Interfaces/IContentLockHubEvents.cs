using ContentLock.Models.Backoffice;
using ContentLock.Options;

namespace ContentLock.Interfaces;

public interface IContentLockHubEvents
{
    /// <summary>
    /// When a user first connects to SignalR we send them out all the current locks
    /// Further updates are done when another user performs a lock or unlock whilst connected
    /// </summary>
    public Task ReceiveLatestContentLocks(List<ContentLockOverviewItem> currentLocks);

    /// <summary>
    /// Fires when the server receives a lock request from a HTTP API call
    /// And will notify ALL connected clients of the new lock
    /// </summary>
    public Task AddLockToClients(ContentLockOverviewItem lockItem);

    /// <summary>
    /// Removes a lock associated with a specific content item for a user.
    /// </summary>
    /// <param name="contentKey">Identifies the content item from which the lock will be removed.</param>
    public Task RemoveLockToClients(Guid contentKey);

    /// <summary>
    /// Removes one or more locks that comes from the bulk unlock dashboard
    /// </summary>
    /// <param name="contentKeys">Identifies the content items from which the locks will be removed.</param>
    public Task RemoveLocksToClients(IEnumerable<Guid> contentKeys);

    public Task UserConnected(Guid? connectedUserKey);

    public Task UserDisconnected(Guid? connectedUserKey);

    public Task ReceiveListOfConnectedUsers(Guid[] connectedUsersKeys);

    public Task ReceiveLatestOptions(ContentLockOptions currentOptions);

    /// <summary>
    /// Notifies clients when a user starts viewing a specific content node
    /// </summary>
    /// <param name="contentKey">The content node key being viewed</param>
    /// <param name="userKey">The user key who started viewing</param>
    public Task UserStartedViewingContent(Guid contentKey, Guid userKey);

    /// <summary>
    /// Notifies clients when a user stops viewing a specific content node
    /// </summary>
    /// <param name="contentKey">The content node key no longer being viewed</param>
    /// <param name="userKey">The user key who stopped viewing</param>
    public Task UserStoppedViewingContent(Guid contentKey, Guid userKey);

    /// <summary>
    /// Sends the list of users currently viewing a specific content node
    /// </summary>
    /// <param name="contentKey">The content node key</param>
    /// <param name="viewingUserKeys">Array of user keys currently viewing this content</param>
    public Task ReceiveUsersViewingContent(Guid contentKey, Guid[] viewingUserKeys);
}