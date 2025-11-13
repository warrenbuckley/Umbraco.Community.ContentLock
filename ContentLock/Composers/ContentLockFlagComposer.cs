using ContentLock.FlagProviders;

using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ContentLock.Composers;

public class ContentLockFlagComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.FlagProviders().Append<IsLockedFlagProvider>();
    }
}
