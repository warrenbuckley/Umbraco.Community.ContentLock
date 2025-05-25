export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.modal.onlineusers',
        name: '[Content Lock] Modal - Online Users',
        type: 'modal',
        js: () => import('./onlineUsers/onlineusers.modal')
    },
    {
        alias: 'contentlock.modal.viewingusers',
        name: '[Content Lock] Modal - Viewing Users',
        type: 'modal',
        js: () => import('./viewingUsers/viewingusers.modal')
    }
]