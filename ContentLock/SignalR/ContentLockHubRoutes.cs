using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

using Umbraco.Cms.Web.Common.Routing;

namespace ContentLock.SignalR;

public class ContentLockHubRoutes : IAreaRoutes
{
    public void CreateRoutes(IEndpointRouteBuilder endpoints)
    {
        // Register the hub route unconditionally. In Umbraco 17.3+ the pipeline
        // is built before migrations complete (background migrations / early Kestrel
        // start), so gating on RuntimeLevel.Run here would leave the hub unregistered.
        // SignalR itself will reject connections gracefully if the runtime isn't ready.
        endpoints.MapHub<ContentLockHub>(GetContentLockHubRoute());
    }

    public string GetContentLockHubRoute()
    {
        return $"/{Umbraco.Cms.Core.Constants.System.UmbracoPathSegment}/{nameof(ContentLockHub)}";
    }
}