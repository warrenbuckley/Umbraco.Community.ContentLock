import { CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS } from "./CanShowCommonActions.Condition";
import { CONTENTLOCK_ENABLE_ONLINE_USERS_CONDITION_ALIAS } from "./EnableOnlineUsers.Condition";
import { CONTENTLOCK_SHOW_LOCK_CONDITION_ALIAS } from "./ShowLock.Condition";
import { CONTENTLOCK_SHOW_LOCKED_STATUS_CONDITION_ALIAS } from "./ShowLockedStatus.Condition";
import { CONTENTLOCK_SHOW_PREVIEW_CONDITION_ALIAS } from "./ShowPreview.Condition";
import { CONTENTLOCK_SHOW_UNLOCK_CONDITION_ALIAS } from "./ShowUnlock.Condition";

export const manifests: Array<UmbExtensionManifest> = [
    {
        type: 'condition',
        alias: CONTENTLOCK_SHOW_LOCK_CONDITION_ALIAS,
        name: '[Content Lock] Show Lock Condition',
        js: () => import('./ShowLock.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_SHOW_UNLOCK_CONDITION_ALIAS,
        name: '[Content Lock] Show Unlock Condition',
        js: () => import('./ShowUnlock.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS,
        name: '[Content Lock] Can Show Common Actions Condition',
        js: () => import('./CanShowCommonActions.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_SHOW_LOCKED_STATUS_CONDITION_ALIAS,
        name: '[Content Lock] Show Locked Status Condition',
        js: () => import('./ShowLockedStatus.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_SHOW_PREVIEW_CONDITION_ALIAS,
        name: '[Content Lock] Show Preview Condition',
        js: () => import('./ShowPreview.Condition'),
    },
    {
        type: 'condition',
        alias: CONTENTLOCK_ENABLE_ONLINE_USERS_CONDITION_ALIAS,
        name: '[Content Lock] Enable Online Users Condition',
        js: () => import('./EnableOnlineUsers.Condition'),
    },
];
