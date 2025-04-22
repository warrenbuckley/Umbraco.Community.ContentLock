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
    
    // Change to track 1 or more connection IDs per User Key
    private static readonly ConcurrentDictionary<Guid, ConcurrentHashSet<string>> ConnectedUsers = new();

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
        // Removes the user who is disconnecting
        await RemoveUserFromListOfConnectedUsersAsync();

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