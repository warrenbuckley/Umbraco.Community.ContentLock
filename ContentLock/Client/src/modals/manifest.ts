export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.modal.onlineusers',
        name: '[Content Lock] Modal - Online Users',
        type: 'modal',
        js: () => import('./onlineusers.modal'),
    },
    {
        alias: 'contentlock.modal.screenshare',
        name: '[Content Lock] Modal - Screen Share',
        type: 'modal',
        js: () => import('./screenshare.modal'),
    }
]