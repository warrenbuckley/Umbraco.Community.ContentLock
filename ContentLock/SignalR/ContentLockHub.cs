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
    
    // Track which users are viewing which content nodes: ContentKey -> UserKey -> ConnectionIds
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, ConcurrentHashSet<string>>> ContentViewers = new();

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
        var connectionId = this.Context.ConnectionId;

        // Remove user from all content they were viewing
        if (currentUserKey.HasValue)
        {
            var contentKeysToClean = new List<Guid>();
            
            // Find all content this user was viewing with this connection
            foreach (var contentViewersKvp in ContentViewers)
            {
                contentKeysToClean.Add(contentViewersKvp.Key);
            }

            // Remove the user from each content they were viewing
            foreach (var contentKey in contentKeysToClean)
            {
                await RemoveUserFromContentViewers(contentKey, currentUserKey.Value, connectionId);
            }
        }

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

    /// <summary>
    /// Called when a user starts viewing a specific content node
    /// </summary>
    /// <param name="contentKey">The content node key being viewed</param>
    public async Task StartViewingContent(Guid contentKey)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();
        var connectionId = this.Context.ConnectionId;

        if (!currentUserKey.HasValue)
            return;

        // Get or create the content viewers dictionary for this content
        var contentViewers = ContentViewers.GetOrAdd(contentKey, _ => new ConcurrentDictionary<Guid, ConcurrentHashSet<string>>());
        
        // Get or create the connection set for this user viewing this content
        var userConnections = contentViewers.GetOrAdd(currentUserKey.Value, _ => new ConcurrentHashSet<string>());
        
        // Track if this is the user's first connection viewing this content
        var isFirstConnection = userConnections.Count == 0;
        
        // Add this connection to the user's viewing connections for this content
        userConnections.TryAdd(connectionId);

        // Only notify if this is the user's first time viewing this content
        if (isFirstConnection)
        {
            // Notify all clients that this user started viewing this content
            await Clients.All.UserStartedViewingContent(contentKey, currentUserKey.Value);
        }

        // Send the current list of viewers for this content to the caller
        var currentViewers = contentViewers.Keys.ToArray();
        await Clients.Caller.ReceiveUsersViewingContent(contentKey, currentViewers);
    }

    /// <summary>
    /// Called when a user stops viewing a specific content node
    /// </summary>
    /// <param name="contentKey">The content node key no longer being viewed</param>
    public async Task StopViewingContent(Guid contentKey)
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();
        var connectionId = this.Context.ConnectionId;

        if (!currentUserKey.HasValue)
            return;

        await RemoveUserFromContentViewers(contentKey, currentUserKey.Value, connectionId);
    }

    private async Task RemoveUserFromContentViewers(Guid contentKey, Guid userKey, string connectionId)
    {
        if (ContentViewers.TryGetValue(contentKey, out var contentViewers))
        {
            if (contentViewers.TryGetValue(userKey, out var userConnections))
            {
                // Remove this specific connection
                userConnections.Remove(connectionId);

                // If user has no more connections viewing this content, remove them entirely
                if (userConnections.Count == 0)
                {
                    contentViewers.TryRemove(userKey, out _);
                    
                    // Notify all clients that this user stopped viewing this content
                    await Clients.All.UserStoppedViewingContent(contentKey, userKey);
                }

                // If no users are viewing this content anymore, clean up the content entry
                if (contentViewers.Count == 0)
                {
                    ContentViewers.TryRemove(contentKey, out _);
                }
            }
        }
    }
}