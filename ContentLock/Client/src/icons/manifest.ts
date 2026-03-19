export const manifests: Array<UmbExtensionManifest> = [
    {
      name: "[Content Lock] Icons",
      alias:"ContentLock.Icons",
      type: "icons",
      js: () => import('./icons')
    }
];