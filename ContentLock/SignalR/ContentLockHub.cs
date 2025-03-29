using System.Collections.Concurrent;
using ContentLock.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class ContentLockHub : Hub<IContentLockHubEvents>
{
    private readonly IContentLockService _contentLockService;
    private static readonly ConcurrentDictionary<Guid, string> ConnectedUsers = new();

    public ContentLockHub(IContentLockService contentLockService)
    {
        _contentLockService = contentLockService;
    }

    public override async Task<Task> OnConnectedAsync()
    {
        // Adds the new connection (user) to the list of connected users
        await AddNewUserToListOfConnectedUsers();

        // Gets the current list of locks from the DB and sends them out to the newly connected SignalR client
        await GetLatestLockInfoForNewConnection();

        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        // Removes the user who is disconnecting
        RemoveUserFromListOfConnectedUsersAsync();

        return base.OnDisconnectedAsync(exception);
    }

    private async Task GetLatestLockInfoForNewConnection()
    {
        // When a client connects do the initial lookup HERE
        var currentLocks = await _contentLockService.GetLockOverviewAsync();

        // Send the current locks to the caller
        // Did not use .All as other connected clients should have a stored state of locks in a repo/store
        await Clients.Caller.ReceiveLatestContentLocks(currentLocks.Items);
    }

    private async Task AddNewUserToListOfConnectedUsers()
    {
        var currentUser = this.Context.User;
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserName = currentUmbUser?.GetRealName() ?? "Unknown User";
        var currentUserKey = currentUmbUser?.GetUserKey();

        // Add new user to the list of connected users
        // Only if the user is not already in the list - check by using the currentUserKey
        if (currentUserKey.HasValue && !ConnectedUsers.ContainsKey(currentUserKey.Value))
        {
            ConnectedUsers.TryAdd(currentUserKey.Value, currentUserName);

            // Notify a client has connected
            // Calls everyone else who is already connected to update them that someone new joined
            await Clients.Others.UserConnected(currentUserKey.Value, currentUserName);

            // Sends the newly connected client
            // The current list of connected users
            await Clients.Caller.ReceiveListOfConnectedUsers(ConnectedUsers);
        }
    }

    private async Task RemoveUserFromListOfConnectedUsersAsync()
    {
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var currentUserKey = currentUmbUser?.GetUserKey();

        if (currentUserKey.HasValue)
        {
            ConnectedUsers.TryRemove(currentUserKey.Value, out _);

            // Notify everyone that someone has disconnected
            await Clients.All.UserDisconnected(currentUserKey.Value);
        }
    }
}