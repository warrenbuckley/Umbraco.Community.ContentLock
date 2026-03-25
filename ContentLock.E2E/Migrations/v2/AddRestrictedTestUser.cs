using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Packaging;

namespace ContentLock.E2E.Migrations.v2
{
    /// <summary>
    /// Creates a restricted test user who is in the Editors group only.
    /// This user does NOT have the ContentLock.Unlocker granular permission,
    /// which makes them suitable for testing permission-based scenarios in E2E tests.
    /// </summary>
    public class AddRestrictedTestUser : AsyncPackageMigrationBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<AddRestrictedTestUser> _logger;

        public AddRestrictedTestUser(
            IPackagingService packagingService,
            IMediaService mediaService,
            MediaFileManager mediaFileManager,
            MediaUrlGeneratorCollection mediaUrlGenerators,
            IShortStringHelper shortStringHelper,
            IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IMigrationContext context,
            IOptions<PackageMigrationSettings> packageMigrationsSettings,
            IUserService userService,
            ILogger<AddRestrictedTestUser> logger)
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
            _userService = userService;
            _logger = logger;
        }

        protected override async Task MigrateAsync()
        {
            var superUserKey = Umbraco.Cms.Core.Constants.Security.SuperUserKey;

            // Create a restricted user assigned to Editors group only.
            // Editors do NOT get ContentLock.Unlocker, so this user is suitable
            // for testing that non-privileged users cannot unlock others' locks.
            var createUserResult = await _userService.CreateAsync(superUserKey, new UserCreateModel
            {
                Name = "Restricted User",
                Email = "restricted@hackmakedo.com",
                UserName = "restricted@hackmakedo.com",
                Kind = UserKind.Default,
                UserGroupKeys = new HashSet<Guid>
                {
                    Umbraco.Cms.Core.Constants.Security.EditorGroupKey,
                },
            }, approveUser: true);

            if (createUserResult.Success is false)
            {
                _logger.LogError(createUserResult.Exception, "Failed to create restricted E2E user: {Status}", createUserResult.Status);
                throw new Exception($"Failed to create restricted E2E user: {createUserResult.Status}");
            }

            var createdUserKey = createUserResult.Result.CreatedUser?.Key;
            var initialPassword = createUserResult.Result.InitialPassword;

            var changePassword = await _userService.ChangePasswordAsync(superUserKey, new ChangeUserPasswordModel
            {
                UserKey = createdUserKey.GetValueOrDefault(Guid.Empty),
                OldPassword = initialPassword,
                NewPassword = "password1234"
            });

            if (changePassword.Success is false)
            {
                _logger.LogError(changePassword.Exception, "Failed to update password for restricted E2E user: {Status}", changePassword.Status);
                throw new Exception($"Failed to update password for restricted E2E user: {changePassword.Status}");
            }
        }
    }
}
