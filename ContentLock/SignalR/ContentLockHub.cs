using System.Collections.Concurrent;
using ContentLock.Interfaces;
using ContentLock.Options;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

using Umbraco.Cms.Core.Collections;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class ContentLockHub : Hub<IContentLockHubEvents>
{
    private readonly IContentLockService _contentLockService;
    private readonly IOptionsMonitor<ContentLockOptions> _options;

    // Track 1 or more connection IDs per User Key (a user may have multiple tabs open)
    private static readonly ConcurrentDictionary<Guid, ConcurrentHashSet<string>> ConnectedUsers = new();

    // Track active call pairs: both directions are stored so either party can look up the other.
    // e.g. if A calls B: ActiveCalls[A]=B and ActiveCalls[B]=A
    private static readonly ConcurrentDictionary<Guid, Guid> ActiveCalls = new();

    public ContentLockHub(IContentLockService contentLockService, IOptionsMonitor<ContentLockOptions> options)
    {
        _contentLockService = contentLockService;
        _options = options;
        _options.OnChange(OnOptionsChanged);
    }

    private void OnOptionsChanged(ContentLockOptions options)
    {
        // Notify all connected clients of the new options values
        // As the value has been changed
        this.Clients.All.ReceiveLatestOptions(options);
    }

    public override async Task<Task> OnConnectedAsync()
    {
        // Adds the new connection (user) to the list of connected users
        await AddNewUserToListOfConnectedUsers();

        // Gets the current list of locks from the DB and sends them out to the newly connected SignalR client
        await GetLatestLockInfoForNewConnection();

        await GetCurrentOptions();

        return base.OnConnectedAsync();
    }

    public override async Task<Task> OnDisconnectedAsync(Exception? exception)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();

        if (currentUserKey.HasValue)
        {
            // If this user was in an active call, notify the peer and clean up
            await CleanUpCallOnDisconnectAsync(currentUserKey.Value);
        }

        // Removes the user who is disconnecting
        await RemoveUserFromListOfConnectedUsersAsync();

        return base.OnDisconnectedAsync(exception);
    }

    // ── WebRTC Calling Hub Methods (client → server) ──────────────────────

    /// <summary>
    /// Initiates a call from the current user to the target user.
    /// Checks if the target is already in a call; if so, responds with CallBusy.
    /// </summary>
    public async Task SendCallOfferAsync(Guid targetUserKey, string sdpOffer)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var callerKey = currentUmbUser?.GetUserKey();
        var callerName = currentUmbUser?.Name ?? "Unknown";

        if (!callerKey.HasValue) return;

        // Check if the target user is already in a call
        if (ActiveCalls.ContainsKey(targetUserKey))
        {
            await Clients.Caller.CallBusy();
            return;
        }

        // Relay the offer to the target user's connections
        var targetConnections = GetConnectionsForUser(targetUserKey);
        if (targetConnections.Length == 0) return;

        await Clients.Clients(targetConnections).ReceiveCallOffer(callerKey.Value, callerName, sdpOffer);
    }

    /// <summary>
    /// Called by the callee when they accept the incoming call.
    /// Relays the SDP answer back to the original caller and marks both users as in-call.
    /// </summary>
    public async Task SendCallAnswerAsync(Guid callerUserKey, string sdpAnswer)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var calleeKey = currentUmbUser?.GetUserKey();

        if (!calleeKey.HasValue) return;

        // Mark both users as in an active call (bidirectional so either can look up the other)
        ActiveCalls[callerUserKey] = calleeKey.Value;
        ActiveCalls[calleeKey.Value] = callerUserKey;

        // Relay the SDP answer to the caller
        var callerConnections = GetConnectionsForUser(callerUserKey);
        if (callerConnections.Length > 0)
        {
            await Clients.Clients(callerConnections).ReceiveCallAnswer(sdpAnswer);
        }

        // Broadcast the updated in-call user list to all connected clients
        await BroadcastInCallUsersAsync();
    }

    /// <summary>
    /// Relays a WebRTC ICE candidate from one peer to the other during connection establishment.
    /// </summary>
    public async Task SendIceCandidateAsync(Guid peerUserKey, string candidate, string? sdpMid, int? sdpMLineIndex)
    {
        var peerConnections = GetConnectionsForUser(peerUserKey);
        if (peerConnections.Length == 0) return;

        await Clients.Clients(peerConnections).ReceiveIceCandidate(candidate, sdpMid, sdpMLineIndex);
    }

    /// <summary>
    /// Called by the callee when they decline an incoming call offer.
    /// Notifies the caller that the call was declined.
    /// </summary>
    public async Task DeclineCallAsync(Guid callerUserKey)
    {
        var callerConnections = GetConnectionsForUser(callerUserKey);
        if (callerConnections.Length > 0)
        {
            await Clients.Clients(callerConnections).CallDeclined();
        }
    }

    /// <summary>
    /// Called by either party to end an active call.
    /// Notifies the peer, removes both users from ActiveCalls, and broadcasts the updated list.
    /// </summary>
    public async Task EndCallAsync(Guid peerUserKey)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();

        if (!currentUserKey.HasValue) return;

        // Notify the peer
        var peerConnections = GetConnectionsForUser(peerUserKey);
        if (peerConnections.Length > 0)
        {
            await Clients.Clients(peerConnections).CallEnded();
        }

        // Remove both parties from the active calls dictionary
        ActiveCalls.TryRemove(currentUserKey.Value, out _);
        ActiveCalls.TryRemove(peerUserKey, out _);

        // Broadcast the updated in-call user list to all connected clients
        await BroadcastInCallUsersAsync();
    }

    // ── Private Helpers ───────────────────────────────────────────────────

    private static string[] GetConnectionsForUser(Guid userKey)
    {
        if (ConnectedUsers.TryGetValue(userKey, out var connections))
        {
            return connections.ToArray();
        }
        return [];
    }

    private async Task BroadcastInCallUsersAsync()
    {
        var inCallUserKeys = ActiveCalls.Keys.ToArray();
        await Clients.All.ConnectedUsersInCallUpdated(inCallUserKeys);
    }

    private async Task CleanUpCallOnDisconnectAsync(Guid disconnectedUserKey)
    {
        // Check if the disconnected user is currently in a call
        if (!ActiveCalls.TryRemove(disconnectedUserKey, out var peerKey)) return;

        // Remove the peer's side of the call record too
        ActiveCalls.TryRemove(peerKey, out _);

        // Notify the peer that the call has ended due to disconnect
        var peerConnections = GetConnectionsForUser(peerKey);
        if (peerConnections.Length > 0)
        {
            await Clients.Clients(peerConnections).CallEnded();
        }

        // Broadcast updated in-call list (now empty for these two users)
        await BroadcastInCallUsersAsync();
    }

    private async Task GetLatestLockInfoForNewConnection()
    {
        // When a client connects do the initial lookup HERE
        var currentLocks = await _contentLockService.GetLockOverviewAsync();

        // Send the current locks to the caller
        // Did not use .All as other connected clients should have a stored state of locks in an observable
        await Clients.Caller.ReceiveLatestContentLocks(currentLocks.Items);
    }

    private async Task AddNewUserToListOfConnectedUsers()
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();

        // Need to keep track of the connections, as a user may have one or more connections (tabs)
        var connectionId = this.Context.ConnectionId;

        // Add new user to the list of connected users
        if (currentUserKey.HasValue)
        {
            // Get or create user's connection dictionary
            var userConnections = ConnectedUsers.GetOrAdd(currentUserKey.Value, _ => new ConcurrentHashSet<string>());

            // Add the Connection ID associated to the Users GUID
            userConnections.TryAdd(connectionId);

            // Only notify others if this is the user's first connection
            // As they could be using different tabs or perhaps browser
            if (userConnections.Count == 1)
            {
                // Notify a client has connected
                // Calls everyone else who is already connected to update them that someone new joined
                await Clients.Others.UserConnected(currentUserKey.Value);
            }

            // Sends the newly connected client
            // The current list of connected users GUID/Keys
            await Clients.Caller.ReceiveListOfConnectedUsers(ConnectedUsers.Keys.ToArray());

            // Also send the current in-call users so the new client knows who is busy
            await Clients.Caller.ConnectedUsersInCallUpdated(ActiveCalls.Keys.ToArray());
        }
    }

    private async Task RemoveUserFromListOfConnectedUsersAsync()
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();
        var connectionId = this.Context.ConnectionId;

        if (currentUserKey.HasValue && ConnectedUsers.TryGetValue(currentUserKey.Value, out var userConnections))
        {
            // Remove this specific connection from Hashset associated to the User Key
            userConnections.Remove(connectionId);

            // If user has no more connections, remove them entirely from dictionary
            if (userConnections.Count == 0)
            {
                ConnectedUsers.TryRemove(currentUserKey.Value, out _);

                // Notify everyone that someone has disconnected
                await Clients.All.UserDisconnected(currentUserKey.Value);
            }
        }
    }

    private async Task GetCurrentOptions()
    {
        // When a client connects do the initial lookup of options
        var currentOptions = _options.CurrentValue;

        // Send the current options to the caller
        // Did not use .All as other connected clients should have a stored state of options in an observable
        await Clients.Caller.ReceiveLatestOptions(currentOptions);
    }
}
