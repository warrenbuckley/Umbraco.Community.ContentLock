using ContentLock.Migrations.v1;
using ContentLock.Migrations.v2;
using Umbraco.Cms.Core.Packaging;

namespace ContentLock.Migrations
{
    public class ContentLockMigrationPlan : PackageMigrationPlan
    {
        public ContentLockMigrationPlan() : base("Umbraco.Community.ContentLock")
        {
        }

        protected override void DefinePlan()
        {
            From(InitialState)
                .To<InitDatabaseTable>("ContentLock.InitDbTables")
                .To<AddUserPermissionToAdmins>("ContentLock.AddUserPermissionToAdmins")
                .To<AddIsAutoLockColumn>("ContentLock.AddIsAutoLockColumn");
        }
    }
}
