using ContentLock.Options;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ContentLock.Composers;

public class ContentLockSignalRComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddContentLockSignalRHub();
        
        builder.Services
            .AddOptions<ContentLockOptions>()
            .Bind(builder.Config.GetSection(ContentLockOptions.ConfigName));
    }
}