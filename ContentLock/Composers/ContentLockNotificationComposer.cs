using ContentLock.Notifications;

using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Composers;

public class ContentLockNotificationComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<ContentMovingToRecycleBinNotification, ContentMovingToRecycleBinHandler>();
    }
}