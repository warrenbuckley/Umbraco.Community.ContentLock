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

namespace ContentLock.E2E.Migrations.v1
{
    public class AddTestUsers : AsyncPackageMigrationBase
    {
        private readonly IUserService _userService;
        private readonly IUserGroupService _userGroupService;

        public AddTestUsers(
            IPackagingService packagingService,
            IMediaService mediaService,
            MediaFileManager mediaFileManager,
            MediaUrlGeneratorCollection mediaUrlGenerators,
            IShortStringHelper shortStringHelper,
            IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IMigrationContext context,
            IOptions<PackageMigrationSettings> packageMigrationsSettings,
            IUserService userService,
            IUserGroupService userGroupService)
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
            _userGroupService = userGroupService;
        }

        protected override async Task MigrateAsync()
        {
            // Performing user creating the test user (aka super user)
            var superUserKey = Umbraco.Cms.Core.Constants.Security.SuperUserKey;
            
            // Create a new user
            var createUserResult = await _userService.CreateAsync(superUserKey, new UserCreateModel
            {
                Name = "Emma Buckley",
                Email = "emma@hackmakedo.com",
                UserName = "emma@hackmakedo.com",
                Kind = UserKind.Default,
                UserGroupKeys = new HashSet<Guid>
                {
                    Umbraco.Cms.Core.Constants.Security.AdminGroupKey,
                    Umbraco.Cms.Core.Constants.Security.EditorGroupKey,
                    Umbraco.Cms.Core.Constants.Security.WriterGroupKey,
                    Umbraco.Cms.Core.Constants.Security.TranslatorGroupKey,
                    Umbraco.Cms.Core.Constants.Security.SensitiveDataGroupKey
                },
            }, approveUser: true);
            
            if(createUserResult.Success is false){
                // TODO: Logging and better error handling
                throw new Exception($"Failed to create user: {createUserResult.Status}");
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
                // TODO: Logging and better error handling
                throw new Exception($"Failed to change password for super user: {changePassword.Exception?.Message ?? "Unknown error"}");
            }
        }
    }
}
