export const manifests: Array<UmbExtensionManifest> = [
    {
      name: '[Content Lock] SignalR Global Context',
      alias: 'ContentLock.GlobalContext.SignalR',
      type: 'globalContext',
      js: () => import('./contentlock.signalr.context'),
    }
  ];
  