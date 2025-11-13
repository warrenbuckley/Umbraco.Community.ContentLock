using Umbraco.Cms.Api.Management.Services.Flags;
using Umbraco.Cms.Api.Management.ViewModels;
using Umbraco.Cms.Api.Management.ViewModels.Document.Collection;
using Umbraco.Cms.Api.Management.ViewModels.Document.Item;
using Umbraco.Cms.Api.Management.ViewModels.Tree;

namespace ContentLock.FlagProviders;
public class IsLockedFlagProvider : IFlagProvider
{
    private const string Alias = Umbraco.Cms.Core.Constants.Conventions.Flags.Prefix + "ContentLock.Locked";

    // Indicate that this flag provider only provides flags for documents.
    public bool CanProvideFlags<TItem>()
        where TItem : IHasFlags =>
        typeof(TItem) == typeof(DocumentTreeItemResponseModel) ||
        typeof(TItem) == typeof(DocumentCollectionResponseModel) ||
        typeof(TItem) == typeof(DocumentItemResponseModel);

    public async Task PopulateFlagsAsync<TItem>(IEnumerable<TItem> itemViewModels)
        where TItem : IHasFlags
    {
        foreach (TItem item in itemViewModels)
        {
            // DEMO: Just add it to everything
            item.AddFlag(Alias);
        }
    }
}
