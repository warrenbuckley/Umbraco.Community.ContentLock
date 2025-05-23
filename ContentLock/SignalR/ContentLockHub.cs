using System.Collections.Concurrent;
using ContentLock.Interfaces;
using ContentLock.Options;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Collections;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class ContentLockHub : Hub<IContentLockHubEvents>
{
    private readonly IContentLockService _contentLockService;
    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IUserService _userService;

    // Change to track UserActivity per connectionId
    private static readonly ConcurrentDictionary<string, UserActivity> ConnectedUsersActivities = new();

    public ContentLockHub(
        IContentLockService contentLockService, 
        IOptionsMonitor<ContentLockOptions> options,
        IUserService userService)
    {
        _contentLockService = contentLockService;
        _options = options;
        _userService = userService;
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
        await AddNewUserToListOfConnectedUsersAsync();

        // Gets the current list of locks from the DB and sends them out to the newly connected SignalR client
        await GetLatestLockInfoForNewConnection();

        await GetCurrentOptions();

        return base.OnConnectedAsync();
    }

    public override async Task<Task> OnDisconnectedAsync(Exception? exception)
    {
        // Removes the user who is disconnecting
        await RemoveUserFromListOfConnectedUsersAsync(Context.ConnectionId);

        return base.OnDisconnectedAsync(exception);
    }

    private async Task GetLatestLockInfoForNewConnection()
    {
        // When a client connects do the initial lookup HERE
        var currentLocks = await _contentLockService.GetLockOverviewAsync();

        // Send the current locks to the caller
        // Did not use .All as other connected clients should have a stored state of locks in an observable
        await Clients.Caller.ReceiveLatestContentLocks(currentLocks.Items);
    }

    private async Task AddNewUserToListOfConnectedUsersAsync()
    {
        var currentUmbUser = Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();
        var connectionId = Context.ConnectionId;

        if (currentUserKey.HasValue)
        {
            var user = await _userService.GetAsync(currentUserKey.Value);
            if (user == null)
            {
                // TODO: Log warning ("User not found with key: " + currentUserKey.Value)
                return;
            }
            var userName = user.Name ?? "Unknown User";

            var activity = new UserActivity { UserKey = currentUserKey.Value, UserName = userName, ActiveContentNodeKey = null };
            ConnectedUsersActivities.TryAdd(connectionId, activity);

            // Notification Logic:
            // Only notify others if this is the user's first connection overall.
            // Check if this UserKey was not previously present in ConnectedUsersActivities.Values (ignoring current connectionId).
            bool isFirstConnectionForUser = ConnectedUsersActivities.Values.Count(ua => ua.UserKey == currentUserKey.Value) == 1;
            if (isFirstConnectionForUser)
            {
                await Clients.Others.UserConnected(currentUserKey.Value, userName);
            }

            // Send the newly connected client the current list of unique user keys
            var allUserKeysAndNames = ConnectedUsersActivities.Values
                .Select(ua => new { ua.UserKey, ua.UserName })
                .Distinct()
                .ToDictionary(x => x.UserKey.ToString(), x => x.UserName);
            
            // The client side is expecting an array of Guids (user keys)
            // For now, let's stick to the existing contract and send only keys
            // TODO: Update client to receive user names as well for richer display
            var allUserKeys = ConnectedUsersActivities.Values.Select(ua => ua.UserKey).Distinct().ToArray();
            await Clients.Caller.ReceiveListOfConnectedUsers(allUserKeys);
        }
    }

    private async Task RemoveUserFromListOfConnectedUsersAsync(string connectionId)
    {
        if (ConnectedUsersActivities.TryRemove(connectionId, out var userActivity))
        {
            var currentUserKey = userActivity.UserKey;
            var userName = userActivity.UserName; // Store before potential modification/removal

            // If the user was viewing a specific content node, notify others they are no longer viewing it.
            if (userActivity.ActiveContentNodeKey.HasValue)
            {
                await Clients.All.UserActivityChanged(currentUserKey, userName, userActivity.ActiveContentNodeKey.Value, false);
            }

            // Notification Logic for UserDisconnected:
            // Only notify if this was the last connection for the user.
            bool wasLastConnectionForUser = !ConnectedUsersActivities.Values.Any(ua => ua.UserKey == currentUserKey);
            if (wasLastConnectionForUser)
            {
                await Clients.All.UserDisconnected(currentUserKey);
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

    public async Task UserIsViewingContent(Guid contentNodeKey)
    {
        var connectionId = Context.ConnectionId;
        if (ConnectedUsersActivities.TryGetValue(connectionId, out var userActivity))
        {
            userActivity.ActiveContentNodeKey = contentNodeKey;
            // Notify all clients that this user is viewing this content
            await Clients.All.UserActivityChanged(userActivity.UserKey, userActivity.UserName, contentNodeKey, true);
        }
    }

    public async Task UserIsLeavingContent(Guid contentNodeKey)
    {
        var connectionId = Context.ConnectionId;
        if (ConnectedUsersActivities.TryGetValue(connectionId, out var userActivity))
        {
            // Store details before modifying ActiveContentNodeKey
            var userKey = userActivity.UserKey;
            var userName = userActivity.UserName;

            if (userActivity.ActiveContentNodeKey == contentNodeKey)
            {
                userActivity.ActiveContentNodeKey = null;
                // Notify all clients that this user is no longer viewing this content
                await Clients.All.UserActivityChanged(userKey, userName, contentNodeKey, false);
            }
        }
    }
}