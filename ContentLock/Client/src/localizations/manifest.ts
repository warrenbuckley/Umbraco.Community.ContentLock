export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'contentlock.localization.en',
        name: 'English',
        type: 'localization',
        js: () => import('./en'),
        meta: {
            culture: 'en',
        }
    },
    {
        alias: 'contentlock.localization.fr',
        name: 'français',
        type: 'localization',
        js: () => import('./fr'),
        meta: {
            culture: 'fr-FR',
        }
    },
    {
        alias: 'contentlock.localization.dk',
        name: 'Dansk (Danmark)',
        type: 'localization',
        js: () => import('./dk'),
        meta: {
            culture: 'da-DK',
        }
    },
    {
        alias: 'contentlock.localization.nl',
        name: 'Nederlands',
        type: 'localization',
        js: () => import('./nl'),
        meta: {
            culture: 'nl-NL',
        }
    },
    {
        alias: 'contentlock.localization.it',
        name: 'italiano',
        type: 'localization',
        js: () => import('./it'),
        meta: {
            culture: 'it-IT',
        }
    },
]