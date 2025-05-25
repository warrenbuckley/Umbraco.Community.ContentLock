export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.modal.users',
        name: '[Content Lock] Modal - Online Users',
        type: 'modal',
        js: () => import('./users.modal'),
    }
]