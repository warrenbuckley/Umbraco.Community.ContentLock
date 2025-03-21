export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.localization.en',
        name: '[Content Lock] English',
        type: 'localization',
        js: () => import('./en'),
        meta: {
            culture: 'en',
        }
    },
    {
        alias: 'contentlock.localization.fr',
        name: '[Content Lock] French',
        type: 'localization',
        js: () => import('./fr'),
        meta: {
            culture: 'fr',
        }
    },
]