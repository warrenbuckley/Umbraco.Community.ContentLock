using ContentLock.Models.Database;
using Umbraco.Cms.Infrastructure.Migrations;

namespace ContentLock.Migrations.v2;

// ReSharper disable once ClassNeverInstantiated.Global
public class AddIsAutoLockColumn(IMigrationContext context) : AsyncMigrationBase(context)
{
    protected override Task MigrateAsync()
    {
        if (TableExists(ContentLocks.TableName) is false)
        {
            return Task.CompletedTask;
        }

        const string columnName = "IsAutoLock";
        var hasColumn = Context.SqlContext.SqlSyntax.GetColumnsInSchema(Context.Database)
            .Any(c => c.TableName == ContentLocks.TableName && c.ColumnName == columnName);

        if (hasColumn is false)
        {
            AddColumn<ContentLocks>(ContentLocks.TableName, columnName);
        }

        return Task.CompletedTask;
    }
}
