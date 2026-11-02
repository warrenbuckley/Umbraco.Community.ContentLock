using ContentLock.Models.Database;

using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Extensions;

namespace ContentLock.Migrations.v2;

public class AddAutoLockActivityColumns(IMigrationContext context) : AsyncMigrationBase(context)
{
    protected override Task MigrateAsync()
    {
        if (TableExists(ContentLocks.TableName) is false)
        {
            return Task.CompletedTask;
        }

        var existingColumns = Context.SqlContext.SqlSyntax.GetColumnsInSchema(Context.Database)
            .Where(c => c.TableName == ContentLocks.TableName)
            .Select(c => c.ColumnName)
            .ToHashSet();

        foreach (var column in (string[])["AutoLockConnectionId", "AutoLockLastActivity"])
        {
            if (existingColumns.Contains(column) is false)
            {
                AddColumn<ContentLocks>(ContentLocks.TableName, column);
            }
        }

        // Auto-locks created before these columns existed get a full inactivity window instead of never expiring
        Database.Execute(Sql()
            .Update<ContentLocks>(u => u.Set(x => x.AutoLockLastActivity, DateTime.UtcNow))
            .Where<ContentLocks>(x => x.IsAutoLock == true && x.AutoLockLastActivity == null));

        return Task.CompletedTask;
    }
}
