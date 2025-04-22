import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface OnlineUsersModalData {
}

export interface OnlineUsersModalValue {
}

export const CONTENTLOCK_ONLINEUSERS_MODAL = new UmbModalToken<OnlineUsersModalData, OnlineUsersModalValue>('contentlock.modal.onlineusers', {
    modal: {
        type: 'sidebar',
        size: 'small' // full, large, medium, small
    }
});