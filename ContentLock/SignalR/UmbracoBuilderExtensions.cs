using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Web.Common.ApplicationBuilder;
using Umbraco.Extensions;

namespace ContentLock.SignalR;

public static class UmbracoBuilderExtensions
{
    public static IUmbracoBuilder AddContentLockSignalRHub(this IUmbracoBuilder builder)
    {
        // first we are going to add signalR to the serviceCollection if no hubs have been added yet
        // this is just in case Umbraco ever decides to use a different technology
        // https://docs.umbraco.com/umbraco-cms/implementation/custom-routing/signalr#add-the-routing-to-the-umbraco-composer
        if (!builder.Services.Any(x => x.ServiceType == typeof(IHubContext<>)))
        {
            builder.Services.AddSignalR();
        }
        
        // Route for the SignalR Hub
        builder.Services.AddSingleton<ContentLockHubRoutes>();
        
        // Configure Umbraco Pipeline Options
        builder.Services.Configure<UmbracoPipelineOptions>(opts =>
        {
            opts.AddFilter(new UmbracoPipelineFilter("ContentLockHubFilter", endpoints: applicationBuilder =>
                {
                    // Adds in our custom SignalR Hub Routes with Umbraco
                    applicationBuilder.UseEndpoints(e =>
                    {
                        var hubRoutes = applicationBuilder.ApplicationServices.GetRequiredService<ContentLockHubRoutes>();
                        hubRoutes.CreateRoutes(e);
                    });
                }
            ));
        });
        
        // Rather than update appsettings lets do it with code
        // Not 100% sure this is even needed ?!
        builder.Services.PostConfigure<GlobalSettings>(settings =>
        {
            // Append new paths to the existing ReservedPaths
            // Would be nice to use ContentLockHubRoutes.GetContentLockHubRoute() 
            settings.ReservedPaths += "~/umbraco/ContentLockHub/,";
        });
        
        return builder;
    }
}