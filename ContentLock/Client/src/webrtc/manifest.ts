export const manifests: Array<UmbExtensionManifest> = [
    {
        name: '[Content Lock] WebRTC Global Context',
        alias: 'ContentLock.GlobalContext.WebRTC',
        type: 'globalContext',
        js: () => import('./contentlock.webrtc.context'),
    },
];
