using ContentLock.Interfaces;
using ContentLock.SignalR;

using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace ContentLock.Notifications;

public class ContentDeletingNotificationHandler : INotificationAsyncHandler<ContentDeletingNotification>
{
    private readonly IContentLockService _contentLockService;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _contentLockHubContext;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
    private readonly ILogger<ContentMovingToRecycleBinHandler> _logger;

    public ContentDeletingNotificationHandler(
        IContentLockService contentLockService,
        IHubContext<ContentLockHub, IContentLockHubEvents> contentLockHubContext,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
        ILogger<ContentMovingToRecycleBinHandler> logger)
    {
        _contentLockService = contentLockService;
        _contentLockHubContext = contentLockHubContext;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
        _logger = logger;
    }
    
    public async Task HandleAsync(ContentDeletingNotification notification, CancellationToken cancellationToken)
    {
        var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var currentUserKey = currentUser?.Key ?? Umbraco.Cms.Core.Constants.Security.SuperUserKey;
        
        var deletingContentKeys = notification.DeletedEntities.Select(x => x.Key).ToHashSet();
        
        // Optimize: Only fetch lock overview if we have items to check
        if (deletingContentKeys.Count == 0)
        {
            return;
        }
        
        var allLocks = await _contentLockService.GetLockOverviewAsync();
        
        // Optimize: Use HashSet for O(1) lookup instead of Contains in Where
        var lockedDeletedItems = allLocks.Items
            .Where(x => deletingContentKeys.Contains(x.Key))
            .ToList();
        
        if (lockedDeletedItems.Any() is false)
        {
            _logger.LogTrace("The content being deleted does not have any content locks. Nothing for us to do here.");
            return;
        }

        var unlockedKeys = new List<Guid>();
        
        foreach (var lockedDeletedNode in lockedDeletedItems)
        {
            // Item is locked and being put into the bin, so we need to remove the lock
            // When a node is locked only the locker can perform the delete from the UI as other users are not allowed
            // The only scenario is that custom integrations or API calls could delete a locked item as an other user
            // If that does happen we need to cancel the notification/operation and add a message to the notification itself

            // The value in the dictionary is the lock info object
            var lockedBy = lockedDeletedNode.CheckedOutByKey;
            if (currentUserKey != lockedBy)
            {
                // Cancel the delete operation if the current user is not the one who locked the item
                notification.Cancel = true;
                notification.Messages.Add(new EventMessage(
                    "Content Lock",
                    $"You can not delete '{lockedDeletedNode.NodeName}' [{lockedDeletedNode.Key}], as it is a locked node that is not locked by you",
                    EventMessageType.Error)
                );
                
                _logger.LogError("You can not delete {lockedDeletedNodeName} [{lockedDeletedNodeKey}], as it is a locked node that is not locked by you", lockedDeletedNode.NodeName, lockedDeletedNode.Key);
                continue;
            }
            
            // Unlock node
            try
            {
                await _contentLockService.UnlockContentAsync(lockedDeletedNode.Key, currentUserKey);
                unlockedKeys.Add(lockedDeletedNode.Key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to unlock content with key {lockedDeletedNodeKey} by user {currentUserKey}", lockedDeletedNode.Key, currentUserKey);
            }
        }
        
        // Notify all connected clients with SignalR that items have been unlocked
        if (unlockedKeys.Count > 0)
        {
            await _contentLockHubContext.Clients.All.RemoveLocksToClients(unlockedKeys);
        }
    }
}