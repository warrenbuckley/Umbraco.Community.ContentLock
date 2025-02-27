using ContentLock.Models.Database;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Packaging;

namespace ContentLock.Migrations.v1
{
    public class InitDatabaseTable : PackageMigrationBase
    {
        public InitDatabaseTable(
            IPackagingService packagingService,
            IMediaService mediaService,
            MediaFileManager mediaFileManager,
            MediaUrlGeneratorCollection mediaUrlGenerators,
            IShortStringHelper shortStringHelper,
            IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IMigrationContext context,
            IOptions<PackageMigrationSettings> packageMigrationsSettings) 
            : base(
                  packagingService,
                  mediaService,
                  mediaFileManager,
                  mediaUrlGenerators,
                  shortStringHelper,
                  contentTypeBaseServiceProvider,
                  context,
                  packageMigrationsSettings)
        {
        }

        protected override void Migrate()
        {
            if (TableExists(ContentLocks.TableName) is false)
            {
                Create.Table<ContentLocks>().Do();
            }
        }
    }
}
