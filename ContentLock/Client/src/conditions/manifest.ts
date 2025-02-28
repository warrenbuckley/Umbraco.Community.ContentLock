import { CONTENTLOCK_IS_LOCKED_ALLOWED_CONDITION_ALIAS } from "./ContentLocked.Allowed.Condition";
import { CONTENTLOCK_IS_LOCKED_NOT_ALLOWED_CONDITION_ALIAS } from "./ContentLocked.NotAllowed.Condition";

export const manifests: Array<UmbExtensionManifest> = [
    {
        type: 'condition',
        alias: CONTENTLOCK_IS_LOCKED_NOT_ALLOWED_CONDITION_ALIAS,
        name: '[Content Lock] Content Is Locked - Not Allowed Condition',
        js: () => import('./ContentLocked.NotAllowed.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_IS_LOCKED_ALLOWED_CONDITION_ALIAS,
        name: '[Content Lock] Content Is Locked - Allowed Condition',
        js: () => import('./ContentLocked.Allowed.Condition'),
    }
];
