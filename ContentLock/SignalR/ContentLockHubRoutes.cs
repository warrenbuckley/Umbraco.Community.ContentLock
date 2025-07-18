using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Routing;

namespace ContentLock.SignalR;

public class ContentLockHubRoutes : IAreaRoutes
{
    private readonly IRuntimeState _runtimeState;

    public ContentLockHubRoutes(IRuntimeState runtimeState)
    {
        _runtimeState = runtimeState;
    }
    
    public void CreateRoutes(IEndpointRouteBuilder endpoints)
    {
        switch (_runtimeState.Level)
        {
            case Umbraco.Cms.Core.RuntimeLevel.Run:
                endpoints.MapHub<ContentLockHub>(GetContentLockHubRoute());
                break;
        }
    }
    
    public string GetContentLockHubRoute()
    {
        return $"/{Umbraco.Cms.Core.Constants.System.UmbracoPathSegment}/{nameof(ContentLockHub)}";
    }
}