export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.modal.onlineusers',
        name: '[Content Lock] Modal - Online Users',
        type: 'modal',
        js: () => import('./onlineusers.modal'),
    }
]