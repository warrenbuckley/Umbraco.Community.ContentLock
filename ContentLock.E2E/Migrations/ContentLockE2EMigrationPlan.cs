using ContentLock.E2E.Migrations.v1;
using ContentLock.E2E.Migrations.v2;
using ContentLock.Migrations.v1;
using Umbraco.Cms.Core.Packaging;

namespace ContentLock.E2E.Migrations
{
    public class ContentLockE2EMigrationPlan : PackageMigrationPlan
    {
        public ContentLockE2EMigrationPlan() : base("Umbraco.Community.ContentLock.E2E")
        {
        }

        protected override void DefinePlan()
        {
            From(InitialState)
                .To<AddTestUsers>("ContentLock.E2E.AddTestUsers")
                .To<AddRestrictedTestUser>("ContentLock.E2E.AddRestrictedTestUser");
        }
    }
}
