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
    public class AddUserPermissionToAdmins : AsyncPackageMigrationBase
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

        protected override async Task MigrateAsync()
        {
            var adminGroup = await _userGroupService.GetAsync(Umbraco.Cms.Core.Constants.Security.AdminGroupKey);
            if (adminGroup == null)
            {
                _logger.LogWarning("ContentLock is unable to find the default Umbraco Admin User Group. Exiting");
                return;
            }

            // Existing permissions are already set, so we can just add the new permission
            var permissions = adminGroup.Permissions;

            // Add new permission (Same as the permission verb in clientside code)
            permissions.Add(Constants.Permission);

            // Update the user group
            var attempt = await _userGroupService.UpdateAsync(adminGroup, Umbraco.Cms.Core.Constants.Security.SuperUserKey);

            _logger.LogTrace("Updated default Umbraco Admin User Group with the 'ContentLock.Enabled' permission with this attempt status {status}", attempt.Status);

            if (!attempt.Success)
            {
                _logger.LogWarning("ContentLock was unable to update the default Umbraco Admin User Group with permission 'ContentLock.Enabled'");
                _logger.LogError(attempt.Exception, "Error updating the User Group permission");
            }
        }
    }
}
