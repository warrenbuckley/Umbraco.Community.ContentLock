import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export const CONTENTLOCK_LOCKED_MODAL_ALIAS = 'contentlock.modal.locked';

export interface LockedModalData {
    lockedBy: string;
}

// Was an empty interface for the return value for the modal
// ESLint recommends to set it as an unknown type for now
export type LockedModalValue = unknown

export const LOCKED_CONTENT_MODAL = new UmbModalToken<LockedModalData, LockedModalValue>(CONTENTLOCK_LOCKED_MODAL_ALIAS, {
    modal: {
        type: 'dialog'
    }
});

