using ContentLock.SignalR;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace ContentLock.Composers;

[ComposeAfter(typeof(ContentLockSignalRComposer))]
public class ContentLockSignalRComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddContentLockSignalRHub();
    }
}