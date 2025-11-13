using ContentLock.Interfaces;

using Microsoft.Extensions.DependencyInjection;

using Umbraco.Cms.Api.Management.Services.Flags;
using Umbraco.Cms.Api.Management.ViewModels;
using Umbraco.Cms.Api.Management.ViewModels.Document.Collection;
using Umbraco.Cms.Api.Management.ViewModels.Document.Item;
using Umbraco.Cms.Api.Management.ViewModels.Tree;

namespace ContentLock.FlagProviders;
public class IsLockedFlagProvider : IFlagProvider
{
    public IsLockedFlagProvider(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory;
    }

    private const string Alias = Umbraco.Cms.Core.Constants.Conventions.Flags.Prefix + "ContentLock.Locked";
    private readonly IServiceScopeFactory _serviceScopeFactory;

    // Indicate that this flag provider only provides flags for documents.
    public bool CanProvideFlags<TItem>()
        where TItem : IHasFlags =>
        typeof(TItem) == typeof(DocumentTreeItemResponseModel) ||
        typeof(TItem) == typeof(DocumentCollectionResponseModel) ||
        typeof(TItem) == typeof(DocumentItemResponseModel);

    public async Task PopulateFlagsAsync<TItem>(IEnumerable<TItem> itemViewModels)
        where TItem : IHasFlags
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var contentLockService = scope.ServiceProvider.GetRequiredService<IContentLockService>();

        // Get all locks currently in the site - once for performance
        var allLocks = await contentLockService.GetLockOverviewAsync();
        var lockedKeys = new HashSet<Guid>(allLocks.Items.Select(x => x.Key));

        foreach (TItem item in itemViewModels)
        {
            // IHasFlags exposes Id, so we can check it directly
            // without casting or pattern matching to the diff models
            if (lockedKeys.Contains(item.Id))
            {
                item.AddFlag(Alias);
            }
        }
    }
}
