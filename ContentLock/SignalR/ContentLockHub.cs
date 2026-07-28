using System.Collections.Concurrent;
using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.Options;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Umbraco.Cms.Core.Collections;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public partial class ContentLockHub : Hub<IContentLockHubEvents>
{
    private readonly IContentLockService _contentLockService;
    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _hubContext;
    private readonly IEventAggregator _eventAggregator;
    private readonly IUserService _userService;
    private readonly ILogger<ContentLockHub> _logger;

    // Track 1 or more connection IDs per User Key (a user may have multiple tabs open)
    private static readonly ConcurrentDictionary<Guid, ConcurrentHashSet<string>> ConnectedUsers = new();

    // Track active call pairs: both directions are stored so either party can look up the other.
    // e.g. if A calls B: ActiveCalls[A]=B and ActiveCalls[B]=A
    private static readonly ConcurrentDictionary<Guid, Guid> ActiveCalls = new();

    // Track pending rings awaiting answer: callerKey → (calleeKey, CancellationTokenSource)
    private static readonly ConcurrentDictionary<Guid, (Guid CalleeKey, CancellationTokenSource Cts)> _pendingRings = new();

    // Reverse index for pending rings: calleeKey → callerKey (used to look up on callee disconnect)
    private static readonly ConcurrentDictionary<Guid, Guid> _pendingRingByCallee = new();

    // Maps each call participant's user key to the original caller's key for their current call.
    // ActiveCalls is bidirectional (A→B and B→A) so by itself it can't tell you who initiated the
    // call once it's answered — this dictionary preserves that distinction so CallEndedNotification
    // always reports the correct caller/callee roles regardless of who hangs up.
    internal static readonly ConcurrentDictionary<Guid, Guid> CallOriginator = new();

    public ContentLockHub(
        IContentLockService contentLockService,
        IOptionsMonitor<ContentLockOptions> options,
        IHubContext<ContentLockHub, IContentLockHubEvents> hubContext,
        IEventAggregator eventAggregator,
        IUserService userService,
        ILogger<ContentLockHub> logger)
    {
        _contentLockService = contentLockService;
        _options = options;
        _hubContext = hubContext;
        _eventAggregator = eventAggregator;
        _userService = userService;
        _logger = logger;
        _options.OnChange(OnOptionsChanged);
    }

    internal async Task PublishCallInitiatedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey)
    {
        var callee = await _userService.GetAsync(calleeUserKey);
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallInitiatedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallInitiatedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }

    internal async Task PublishCallDeclinedAsync(Guid callerUserKey, Guid calleeUserKey, string calleeUserName)
    {
        var caller = await _userService.GetAsync(callerUserKey);
        var callerUserName = caller?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallDeclinedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallDeclinedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }

    internal async Task PublishCallMissedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey)
    {
        var callee = await _userService.GetAsync(calleeUserKey);
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallMissedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallMissedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }

    internal async Task PublishCallEndedAsync(Guid userKeyA, Guid userKeyB)
    {
        CallOriginator.TryRemove(userKeyA, out var originatorForA);
        CallOriginator.TryRemove(userKeyB, out _);

        var callerUserKey = originatorForA == userKeyA ? userKeyA : userKeyB;
        var calleeUserKey = callerUserKey == userKeyA ? userKeyB : userKeyA;

        var caller = await _userService.GetAsync(callerUserKey);
        var callee = await _userService.GetAsync(calleeUserKey);
        var callerUserName = caller?.Name ?? "Unknown";
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallEndedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallEndedNotification handler threw an exception for a call between {userKeyA} and {userKeyB}", userKeyA, userKeyB);
        }
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
            // If this user was in a pending ring (caller or callee), cancel and notify the other party
            await CleanUpPendingRingOnDisconnectAsync(currentUserKey.Value);

            // If this user was in an active call, notify the peer and clean up
            await CleanUpCallOnDisconnectAsync(currentUserKey.Value);
        }

        await CleanUpAutoLocksOnDisconnectAsync(currentUserKey, this.Context.ConnectionId);

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

        // Check if the caller is already ringing or in an active call.
        // If so, cancel and dispose the existing ring CTS before proceeding
        // so the orphaned Task.Delay does not run until timeout and leak resources.
        if (_pendingRings.ContainsKey(callerKey.Value) || ActiveCalls.ContainsKey(callerKey.Value))
        {
            CancelRingTimeout(callerKey.Value);
            await Clients.Caller.CallBusy();
            return;
        }

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

        await PublishCallInitiatedAsync(callerKey.Value, callerName, targetUserKey);

        // Start ring timeout — fires CallNoAnswer to caller and MissedCall to callee if unanswered
        var cts = new CancellationTokenSource();
        _pendingRings[callerKey.Value] = (targetUserKey, cts);
        _pendingRingByCallee[targetUserKey] = callerKey.Value;
        _ = HandleRingTimeoutAsync(callerKey.Value, targetUserKey, callerName, cts.Token);
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

        // Cancel the ring timeout — callee answered in time
        CancelRingTimeout(callerUserKey);

        // Mark both users as in an active call (bidirectional so either can look up the other)
        ActiveCalls[callerUserKey] = calleeKey.Value;
        ActiveCalls[calleeKey.Value] = callerUserKey;

        // Record which of the two was the original caller, for CallEndedNotification later
        CallOriginator[callerUserKey] = callerUserKey;
        CallOriginator[calleeKey.Value] = callerUserKey;

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
        // Cancel the ring timeout — callee explicitly declined
        CancelRingTimeout(callerUserKey);

        var callerConnections = GetConnectionsForUser(callerUserKey);
        if (callerConnections.Length > 0)
        {
            await Clients.Clients(callerConnections).CallDeclined();
        }

        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var calleeKey = currentUmbUser?.GetUserKey();
        var calleeName = currentUmbUser?.Name ?? "Unknown";

        if (calleeKey.HasValue)
        {
            await PublishCallDeclinedAsync(callerUserKey, calleeKey.Value, calleeName);
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

        await PublishCallEndedAsync(currentUserKey.Value, peerUserKey);

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

        await PublishCallEndedAsync(disconnectedUserKey, peerKey);

        // Broadcast updated in-call list (now empty for these two users)
        await BroadcastInCallUsersAsync();
    }

    private async Task CleanUpPendingRingOnDisconnectAsync(Guid disconnectedUserKey)
    {
        // Case 1: Disconnected user was the caller — notify the callee that the ring is gone
        if (_pendingRings.TryGetValue(disconnectedUserKey, out var ring))
        {
            var calleeKey = ring.CalleeKey;
            CancelRingTimeout(disconnectedUserKey);

            var calleeConnections = GetConnectionsForUser(calleeKey);
            if (calleeConnections.Length > 0)
            {
                await Clients.Clients(calleeConnections).CallEnded();
            }

            return;
        }

        // Case 2: Disconnected user was the callee — cancel the caller's ring timeout and notify them
        if (_pendingRingByCallee.TryGetValue(disconnectedUserKey, out var callerKey))
        {
            CancelRingTimeout(callerKey);

            var callerConnections = GetConnectionsForUser(callerKey);
            if (callerConnections.Length > 0)
            {
                await Clients.Clients(callerConnections).CallEnded();
            }
        }
    }

    private async Task HandleRingTimeoutAsync(Guid callerKey, Guid calleeKey, string callerName, CancellationToken ct)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(_options.CurrentValue.WebRTC.RingTimeoutSeconds), ct);
        }
        catch (OperationCanceledException)
        {
            // Timer was cancelled — call was answered, declined, or a party disconnected; nothing to do
            return;
        }

        _pendingRings.TryRemove(callerKey, out _);
        _pendingRingByCallee.TryRemove(calleeKey, out _);

        var callerConns = GetConnectionsForUser(callerKey);
        var calleeConns = GetConnectionsForUser(calleeKey);

        if (callerConns.Length > 0)
            await _hubContext.Clients.Clients(callerConns).CallNoAnswer();

        if (calleeConns.Length > 0)
            await _hubContext.Clients.Clients(calleeConns).MissedCall(callerKey, callerName);

        await PublishCallMissedAsync(callerKey, callerName, calleeKey);
    }

    private static void CancelRingTimeout(Guid callerKey)
    {
        if (_pendingRings.TryRemove(callerKey, out var ring))
        {
            _pendingRingByCallee.TryRemove(ring.CalleeKey, out _);
            ring.Cts.Cancel();
            ring.Cts.Dispose();
        }
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
