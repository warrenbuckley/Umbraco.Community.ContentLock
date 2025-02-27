using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Models.Database;
using Microsoft.Extensions.Logging;
using NPoco;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;

namespace ContentLock.Services
{
    public class ContentLockService : IContentLockService
    {
        private readonly ILogger<ContentLockService> _logger;
        private readonly IScopeProvider _scopeProvider;
        private readonly IUserService _userService;
        private readonly IPublishedContentQuery _publishedContentQuery;

        public ContentLockService(ILogger<ContentLockService> logger,
            IScopeProvider scopeProvider,
            IUserService userService,
            IPublishedContentQuery publishedContentQuery)
        {
            _logger = logger;
            _scopeProvider = scopeProvider;
            _userService = userService;
            _publishedContentQuery = publishedContentQuery;
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
                        IsLocked = lockInfo != null,
                        LockedByKey = lockInfo.UserKey,
                        LockedByName = userName,
                        LockedBySelf = userKey == lockInfo.UserKey
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting lock info for content {contentKey}", contentKey);
                throw;
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
                        var contentNode = _publishedContentQuery.Content(conLock.ContentKey);
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
                            NodeName = contentNode.Name,
                            ContentType = contentNode.ContentType.Alias,
                            CheckedOutBy = userName,
                            CheckedOutByKey = conLock.UserKey,
                            LastEdited = contentNode.UpdateDate
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
                throw;
            }
        }

        public async Task LockContentAsync(Guid contentKey, Guid userKey)
        {
            _logger.LogInformation("Locking content {contentKey} for user {userKey}", contentKey, userKey);

            try
            {
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    await scope.Database.SaveAsync(new ContentLocks { ContentKey = contentKey, UserKey = userKey });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error locking content {contentKey} for user {userKey}", contentKey, userKey);
                throw;
            }
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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking content {contentKey} for user {userKey}", contentKey, userKey);
                throw;
            }
        }
    }
}
