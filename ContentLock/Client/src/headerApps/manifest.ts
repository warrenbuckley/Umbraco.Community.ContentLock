import { CONTENTLOCK_ENABLE_ONLINE_USERS_CONDITION_ALIAS } from '../conditions/EnableOnlineUsers.Condition';

export const manifests: Array<UmbExtensionManifest> = [
    {
      name: '[Content Lock] Number of Users Online Header App',
      alias: 'ContentLock.HeaderApp.NumberOfUsersOnline',
      type: 'headerApp',
      js: () => import('./contentLock.noUsersOnline.headerApp'),
      weight: 1000, // Umbraco's Search icon is set at 900
      conditions: [
        {
          alias: CONTENTLOCK_ENABLE_ONLINE_USERS_CONDITION_ALIAS
        }
      ]
    }
  ];
  