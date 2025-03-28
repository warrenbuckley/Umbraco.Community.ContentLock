export const manifests: Array<UmbExtensionManifest> = [
    {
      name: '[Content Lock] Number of Users Online Header App',
      alias: 'ContentLock.HeaderApp.NumberOfUsersOnline',
      type: 'headerApp',
      js: () => import('./contentLock.noUsersOnline.headerApp'),
      weight: 1000, // Umbraco's Search icon is set at 900
    }
  ];
  