using ContentLock.Notifications;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ContentLock.AutoLock;

public class AutoLockComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<IAutoLockRepository, AutoLockRepository>();
        builder.Services.AddScoped<IAutoLockService, AutoLockService>();

        builder.AddNotificationAsyncHandler<ContentUnlockedNotification, AutoLockUnlockedNotificationHandler>();

        builder.Services.AddRecurringBackgroundJob<AutoLockInactivityJob>();
    }
}
