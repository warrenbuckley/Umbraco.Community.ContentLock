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

    /// <summary>
    /// This is used for E2E testing purposes only
    /// Where the ResetContentLocksAsync method will call this to get clients to remove all locks
    /// </summary>
    public Task RemoveAllLocksToClients();

    public Task UserConnected(Guid? connectedUserKey);

    public Task UserDisconnected(Guid? connectedUserKey);

    public Task ReceiveListOfConnectedUsers(Guid[] connectedUsersKeys);

    public Task ReceiveLatestOptions(ContentLockOptions currentOptions);

    // ── WebRTC Calling ──────────────────────────────────────────────────────

    /// <summary>
    /// Sent to a specific user when another user wants to start an audio call with them.
    /// </summary>
    public Task ReceiveCallOffer(Guid callerKey, string callerName, string sdpOffer);

    /// <summary>
    /// Sent back to the caller when the target user accepts the call.
    /// Contains the SDP answer to complete the WebRTC handshake.
    /// </summary>
    public Task ReceiveCallAnswer(string sdpAnswer);

    /// <summary>
    /// Relays a WebRTC ICE candidate between peers during connection establishment.
    /// </summary>
    public Task ReceiveIceCandidate(string candidate, string? sdpMid, int? sdpMLineIndex);

    /// <summary>
    /// Sent to the caller when the target user declines the incoming call.
    /// </summary>
    public Task CallDeclined();

    /// <summary>
    /// Sent to the remaining party when the other user ends or drops the call.
    /// </summary>
    public Task CallEnded();

    /// <summary>
    /// Sent to a caller when the user they are trying to call is already in another call.
    /// </summary>
    public Task CallBusy();

    /// <summary>
    /// Broadcast to all clients when the set of users currently in a call changes.
    /// Used to update busy indicators in the online users modal.
    /// </summary>
    public Task ConnectedUsersInCallUpdated(Guid[] inCallUserKeys);

    /// <summary>Sent to the CALLER when the ring timeout expires without an answer.</summary>
    public Task CallNoAnswer();

    /// <summary>Sent to the CALLEE when the ring timeout expires. They missed the call.</summary>
    public Task MissedCall(Guid callerKey, string callerName);

    // ── WebRTC Screen Sharing ────────────────────────────────────────────────

    /// <summary>
    /// Sent to the peer when the sharer adds a screen-share video track and starts WebRTC
    /// renegotiation. Contains the new SDP offer so the peer can create an answer.
    /// </summary>
    public Task ReceiveScreenShareOffer(Guid sharerKey, string sharerName, string sdpOffer);

    /// <summary>
    /// Sent back to the sharer with the peer's SDP answer to complete renegotiation.
    /// </summary>
    public Task ReceiveScreenShareAnswer(string sdpAnswer);

    /// <summary>
    /// Sent to the peer after renegotiation completes to trigger the "View Screen" toast.
    /// </summary>
    public Task ScreenShareStarted(Guid sharerKey, string sharerName);

    /// <summary>
    /// Sent to the peer when the sharer stops sharing, causing the viewer modal to close.
    /// </summary>
    public Task ScreenShareEnded();
}