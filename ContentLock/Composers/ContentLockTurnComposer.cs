using ContentLock.Interfaces;
using ContentLock.TurnProviders;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace ContentLock.Composers;

/// <summary>
/// Registers the appropriate <see cref="ITurnCredentialProvider"/> implementation based on
/// the <c>ContentLock:WebRTC:TurnServer:Provider</c> appsettings value.
/// Changing the provider requires an application restart (resolved at DI registration time).
/// Credential values (API keys, tokens) are reactive via <see cref="Microsoft.Extensions.Options.IOptionsMonitor{T}"/>.
/// </summary>
public class ContentLockTurnComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddMemoryCache();
        builder.Services.AddHttpClient("Cloudflare");
        builder.Services.AddHttpClient("Twilio");
        builder.Services.AddHttpClient("Metered");

        var provider = builder.Config
            .GetSection("ContentLock:WebRTC:TurnServer:Provider").Value ?? "None";

        switch (provider.ToLowerInvariant())
        {
            case "cloudflare":
                builder.Services.AddScoped<ITurnCredentialProvider, CloudflareTurnCredentialProvider>();
                break;
            case "twilio":
                builder.Services.AddScoped<ITurnCredentialProvider, TwilioTurnCredentialProvider>();
                break;
            case "metered":
                builder.Services.AddScoped<ITurnCredentialProvider, MeteredTurnCredentialProvider>();
                break;
            case "static":
                builder.Services.AddScoped<ITurnCredentialProvider, StaticTurnCredentialProvider>();
                break;
            default:
                builder.Services.AddScoped<ITurnCredentialProvider, NoneTurnCredentialProvider>();
                break;
        }
    }
}
