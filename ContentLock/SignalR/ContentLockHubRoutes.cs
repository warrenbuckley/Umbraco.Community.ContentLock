using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Hosting;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Routing;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

public class ContentLockHubRoutes : IAreaRoutes
{
    private readonly IRuntimeState _runtimeState;
    private readonly string _umbracoPathSegment;

    public ContentLockHubRoutes(IOptions<GlobalSettings> globalSettings,
        IHostingEnvironment hostingEnvironment,
        IRuntimeState runtimeState)
    {
        _runtimeState = runtimeState;
        _umbracoPathSegment = globalSettings.Value.GetUmbracoMvcArea(hostingEnvironment);
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
        return $"/{_umbracoPathSegment}/{nameof(ContentLockHub)}";
    }
}