using ContentLock.Exceptions;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Models.Database;

using Microsoft.Extensions.Logging;

using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;

namespace ContentLock.Services
{
    public class ContentLockService : IContentLockService
    {
        private readonly ILogger<ContentLockService> _logger;
        private readonly IScopeProvider _scopeProvider;
        private readonly IUserService _userService;
        private readonly IAuditService _auditService;
        private readonly IUserIdKeyResolver _userIdKeyResolver;
        private readonly IIdKeyMap _idKeyMap;
        private readonly IEntityService _entityService;

        public ContentLockService(ILogger<ContentLockService> logger,
            IScopeProvider scopeProvider,
            IUserService userService,
            IAuditService auditService,
            IUserIdKeyResolver userIdKeyResolver,
            IIdKeyMap idKeyMap,
            IEntityService entityService)
        {
            _logger = logger;
            _scopeProvider = scopeProvider;
            _userService = userService;
            _auditService = auditService;
            _userIdKeyResolver = userIdKeyResolver;
            _idKeyMap = idKeyMap;
            _entityService = entityService;
        }

        public async Task<ContentLockStatus> GetLockInfoAsync(Guid contentKey, Guid userKey)
        {
            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    var lockInfo = scope.Database.SingleOrDefaultById<ContentLocks>(contentKey);
                    if (lockInfo == null)
                    {
                        return new ContentLockStatus
                        {
                            IsLocked = false
                        };
                    }

                    var user = await _userService.GetAsync(lockInfo.UserKey);
                    var userName = user?.Name ?? "Unknown";

                    return new ContentLockStatus
                    {
                        IsLocked = true,
                        LockedByKey = lockInfo.UserKey,
                        LockedByName = userName,
                        LockedBySelf = userKey == lockInfo.UserKey,
                        LockedAtDate = lockInfo.LockedAtDate
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting lock info for content {contentKey}", contentKey);
                throw new ContentLockException($"Error getting lock info for content {contentKey}", ex);
            }
        }

        public async Task<ContentLockOverview> GetLockOverviewAsync()
        {
            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    var contentLocks = scope.Database.Fetch<ContentLocks>();
                    var items = new List<ContentLockOverviewItem>();

                    foreach (var conLock in contentLocks)
                    {
                        var contentNode = _entityService.Get(conLock.ContentKey, UmbracoObjectTypes.Document) as IDocumentEntitySlim;
                        if (contentNode == null)
                        {
                            _logger.LogWarning("Content node not found for key {contentKey}", conLock.ContentKey);
                            continue;
                        }

                        var user = await _userService.GetAsync(conLock.UserKey);
                        var userName = user?.Name ?? "Unknown";

                        items.Add(new ContentLockOverviewItem
                        {
                            Key = conLock.ContentKey,
                            NodeName = contentNode.Name ?? "Unknown",
                            ContentType = contentNode.ContentTypeAlias,
                            CheckedOutBy = userName,
                            CheckedOutByKey = conLock.UserKey,
                            LastEdited = contentNode.UpdateDate,
                            LockedAtDate = conLock.LockedAtDate
                        });
                    }

                    return new ContentLockOverview
                    {
                        TotalResults = contentLocks.Count,
                        Items = items
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting lock overview");
                throw new ContentLockException("Error getting lock overview", ex);
            }
        }

        public async Task<ContentLockOverviewItem> LockContentAsync(Guid contentKey, Guid userKey)
        {
            _logger.LogInformation("Locking content {contentKey} for user {userKey}", contentKey, userKey);

            var now = DateTime.Now;
            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    await scope.Database.SaveAsync(new ContentLocks { 
                        ContentKey = contentKey,
                        UserKey = userKey,
                        LockedAtDate = now
                    });
                }

                // Convert Key to old style int's to use with AuditService
                var contentNodeAsAnId = _idKeyMap.GetIdForKey(contentKey, UmbracoObjectTypes.Document).Result; // Inject and use IIdKeyMap
                await _auditService.AddAsync(AuditType.Custom, userKey, contentNodeAsAnId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Locked", "Page Locked");

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error locking content {contentKey} for user {userKey}", contentKey, userKey);
                throw new ContentLockException($"Error locking content {contentKey} for user {userKey}", ex);
            }

            // Get the info about the locked item
            // This will be sent out via SignalR to all connected clients
            var contentNode = _entityService.Get(contentKey, UmbracoObjectTypes.Document) as IDocumentEntitySlim;
            if (contentNode == null)
            {
                _logger.LogWarning("Unable to lock node, as content node not found for key {contentKey}", contentKey);
                throw new ContentLockException($"Unable to lock node, as content node not found for key {contentKey}");
            }

            var user = await _userService.GetAsync(userKey);
            var userName = user?.Name ?? "Unknown";

            var lockInfo = new ContentLockOverviewItem
            {
                Key = contentKey,
                NodeName = contentNode.Name ?? "Unknown",
                ContentType = contentNode.ContentTypeAlias,
                CheckedOutBy = userName,
                CheckedOutByKey = userKey,
                LastEdited = contentNode.UpdateDate,
                LockedAtDate = now
            };

            return lockInfo;
        }

        public async Task UnlockContentAsync(Guid contentKey, Guid userKey)
        {
            _logger.LogInformation("Unlocking content {contentKey} for user {userKey}", contentKey, userKey);

            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    await scope.Database.DeleteAsync(new ContentLocks { ContentKey = contentKey, UserKey = userKey });
                }

                // Convert Key to old style int's to use with AuditService
                var contentNodeAsAnId = _idKeyMap.GetIdForKey(contentKey, UmbracoObjectTypes.Document).Result;
                await _auditService.AddAsync(AuditType.Custom, userKey, contentNodeAsAnId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Unlocked", "Page Unlocked");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking content {contentKey} for user {userKey}", contentKey, userKey);
                throw new ContentLockException($"Error unlocking content {contentKey} for user {userKey}", ex);
            }
        }
    }
}
