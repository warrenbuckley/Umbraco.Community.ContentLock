using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Extensions;

namespace ContentLock.Extensions
{
    public static class IUserExtensions
    {
        public static bool HasPermission(this IUser user, string permission)
        {
            return user.Groups.SelectMany(g => g.Permissions).InvariantContains(permission);
        }

        public static bool HasContentUnlockPermission(this IUser user)
        {
            return user.HasPermission(Constants.Permission);
        }

    }
}
