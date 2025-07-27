using ContentLock.Interfaces;

using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Notifications;

public class ContentDeletingHandler : INotificationAsyncHandler<ContentDeletingNotification>
{
    private readonly IContentLockService _contentLockService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
    
    public ContentDeletingHandler(
        IContentLockService contentLockService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _contentLockService = contentLockService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }
    
    public async Task HandleAsync(ContentDeletingNotification notification, CancellationToken cancellationToken)
    {
        var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var currentUserKey = currentUser?.Key ?? Umbraco.Cms.Core.Constants.Security.SuperUserKey;
        
        var deletingContentKeys = notification.DeletedEntities.Select(x => x.Key).ToList();
        var allLocks = await _contentLockService.GetLockOverviewAsync();
        var allLockKeys = allLocks.Items.Select(x => x.Key).ToHashSet();
        var lockedDeletedItems = deletingContentKeys.Where(nodeKey => allLockKeys.Contains(nodeKey)).ToList();

        if (lockedDeletedItems.Any() is false)
        {
            // TODO: Log trace message
            return;
        }

        foreach (var lockedKey in lockedDeletedItems)
        {
            // Item is locked and being put into the bin, so we need to remove the lock
            // When a node is locked only the locker can perform the delete from the UI as other users are not allowed
            // The only scenario is that custom integrations or API calls could delete a locked item as an other user
            
            // TODO: Is it problematic that another user who did not lock the item can now unlock it if they were to delete it?
            // And what about if the user deleting it who did not lock the node AND also does not have the  explicit unlock permission
            // what should happen?
            // Should we check if the user has the permission to unlock it and cancel the operation and send a notification ?

            notification.Cancel = true;
            notification.Messages.Add(new EventMessage("Content Lock", "You are deleting a node that someone else has a lock on", EventMessageType.Error));
            
            // Unlock node
            await _contentLockService.UnlockContentAsync(lockedKey, currentUserKey);

            // Notify all connected clients with SignalR that item has been unlocked
        }
    }
}