using ContentLock.Models.Database;

using NPoco;

using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace ContentLock.AutoLock;

public class AutoLockRepository(IScopeProvider scopeProvider) : IAutoLockRepository
{
    public Task MarkAutoLockAsync(Guid contentKey, Guid userKey, string? connectionId, DateTime utcNow)
        => ExecuteAsync(sql => sql
            .Update<ContentLocks>(u => u
                .Set(x => x.IsAutoLock, true)
                .Set(x => x.AutoLockConnectionId, connectionId)
                .Set(x => x.AutoLockLastActivity, utcNow))
            .Where<ContentLocks>(x => x.ContentKey == contentKey && x.UserKey == userKey));

    public async Task<bool> TouchAsync(Guid contentKey, Guid userKey, string? connectionId, DateTime utcNow)
        => await ExecuteAsync(sql => sql
            .Update<ContentLocks>(u => u
                .Set(x => x.AutoLockConnectionId, connectionId)
                .Set(x => x.AutoLockLastActivity, utcNow))
            .Where<ContentLocks>(x => x.ContentKey == contentKey && x.UserKey == userKey && x.IsAutoLock == true)) > 0;

    public async Task<bool> TryClaimReleaseAsync(Guid contentKey, Guid userKey)
        => await ExecuteAsync(sql => sql
            .Update<ContentLocks>(u => u.Set(x => x.IsAutoLock, false))
            .Where<ContentLocks>(x => x.ContentKey == contentKey && x.UserKey == userKey && x.IsAutoLock == true)) > 0;

    public Task<IReadOnlyList<AutoLockHolder>> GetByConnectionAsync(string connectionId)
        => FetchAsync(sql => sql.Where<ContentLocks>(x => x.IsAutoLock == true && x.AutoLockConnectionId == connectionId));

    public Task<IReadOnlyList<AutoLockHolder>> GetInactiveAsync(DateTime cutoffUtc)
        => FetchAsync(sql => sql.Where<ContentLocks>(x => x.IsAutoLock == true && x.AutoLockLastActivity < cutoffUtc));

    private async Task<int> ExecuteAsync(Func<Sql<ISqlContext>, Sql<ISqlContext>> build)
    {
        using var scope = scopeProvider.CreateScope(autoComplete: true);
        return await scope.Database.ExecuteAsync(build(scope.SqlContext.Sql()));
    }

    private async Task<IReadOnlyList<AutoLockHolder>> FetchAsync(Func<Sql<ISqlContext>, Sql<ISqlContext>> where)
    {
        using var scope = scopeProvider.CreateScope(autoComplete: true);
        var rows = await scope.Database.FetchAsync<ContentLocks>(where(scope.SqlContext.Sql().SelectAll().From<ContentLocks>()));
        return [.. rows.Select(r => new AutoLockHolder(r.ContentKey, r.UserKey))];
    }
}
