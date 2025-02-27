using Microsoft.Extensions.Logging;
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
    public class AddUserPermissionToAdmins : PackageMigrationBase
    {
        private readonly IUserGroupService _userGroupService;
        private readonly ILogger<AddUserPermissionToAdmins> _logger;

        public AddUserPermissionToAdmins(IPackagingService packagingService,
            IMediaService mediaService,
            MediaFileManager mediaFileManager,
            MediaUrlGeneratorCollection mediaUrlGenerators,
            IShortStringHelper shortStringHelper,
            IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IMigrationContext context,
            IOptions<PackageMigrationSettings> packageMigrationsSettings,
            IUserGroupService userGroupService,
            IUserService userService,
            ILogger<AddUserPermissionToAdmins> logger)
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
            _userGroupService = userGroupService;
            _logger = logger;
        }

        protected override void Migrate()
        {
            // Booo :( the Migrate from PackageMigrationBase does not support Async
            var adminGroup = _userGroupService.GetAsync(Umbraco.Cms.Core.Constants.Security.AdminGroupKey).Result;

            if (adminGroup == null)
            {
                _logger.LogWarning("ContentLock is unable to find the default Umbraco Admin User Group. Exiting");
                return;
            }

            // Permissions ?!
            var permissions = adminGroup.Permissions;

            // Add new permission (Same as the permission verb in clientside code)
            permissions.Add(Constants.Permission);

            // Update the user group
            var attempt = _userGroupService.UpdateAsync(adminGroup, Umbraco.Cms.Core.Constants.Security.SuperUserKey).Result;

            _logger.LogTrace("Updated default Umbraco Admin User Group with the 'ContentLock.Enabled' permission with this attempt status {status}", attempt.Status);

            if (!attempt.Success)
            {
                _logger.LogWarning("ContentLock was unable to update the default Umbraco Admin User Group with permission 'ContentLock.Enabled'");
                _logger.LogError(attempt.Exception, "Error updating the User Group permission");
            }
        }
    }
}
