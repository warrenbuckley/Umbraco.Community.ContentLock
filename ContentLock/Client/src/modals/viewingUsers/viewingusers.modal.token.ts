import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ViewingUsersModalData {
}

export interface ViewingUsersModalValue {
}

export const CONTENTLOCK_VIEWINGUSERS_MODAL = new UmbModalToken<ViewingUsersModalData, ViewingUsersModalValue>('contentlock.modal.viewingusers', {
    modal: {
        type: 'sidebar',
        size: 'small' // full, large, medium, small
    }
});