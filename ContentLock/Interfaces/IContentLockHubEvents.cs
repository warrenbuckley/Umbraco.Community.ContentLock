using ContentLock.Models.Backoffice;

namespace ContentLock.Interfaces;

public interface IContentLockHubEvents
{
    /// <summary>
    /// When a user first connects to SignalR we send them out all the current locks
    /// Further updates are done when another user performs a lock or unlock whilst connected
    /// </summary>
    public Task ReceiveLatestContentLocks(ContentLockOverview currentLocks);

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

    //Task ReceiveConnectedUsers(List<ConnectedUser> connectedUsers);
}