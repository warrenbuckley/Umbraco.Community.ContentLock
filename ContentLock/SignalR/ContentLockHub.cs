using ContentLock.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

using Umbraco.Cms.Web.Common.Authorization;

namespace ContentLock.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class ContentLockHub : Hub<IContentLockHubEvents>
{
    // when a client sends us a ping
    public async Task Ping()
    {
        // we trigger the pong event on all connected clients
        await Clients.All.Pong();
    }

    public override Task OnConnectedAsync()
    {
        // When a client connects do the initial lookup HERE
        
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        return base.OnDisconnectedAsync(exception);
    }
}