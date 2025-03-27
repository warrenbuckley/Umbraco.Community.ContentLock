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

    public ContentLockHub(IContentLockService contentLockService)
    {
        _contentLockService = contentLockService;
    }

    public override async Task<Task> OnConnectedAsync()
    {
        // TODO: Keep track of connected users & count etc
        var currentUser = this.Context.User;
        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var who = currentUmbUser?.GetRealName(); //currentUmbUser.GetUserKey()

        // TODO: Send out to ALL clients the current list of connected users


        // When a client connects do the initial lookup HERE
        var currentLocks = await _contentLockService.GetLockOverviewAsync();

        // Send the current locks to the caller
        // Did not use .All as other connected clients should have a stored state of locks in a repo/store
        await Clients.Caller.ReceiveLatestContentLocks(currentLocks);

        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        // TODO: Remove the user from the connected users list
        //

        return base.OnDisconnectedAsync(exception);
    }
}