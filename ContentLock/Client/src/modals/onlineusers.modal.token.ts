import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import { UserBasicInfo } from '../interfaces/UserBasicInfo';

export interface OnlineUsersModalData {
  usersToShow?: UserBasicInfo[];
  modalTitle?: string;
}

export interface OnlineUsersModalValue {
}

export const CONTENTLOCK_ONLINEUSERS_MODAL = new UmbModalToken<OnlineUsersModalData, OnlineUsersModalValue>('contentlock.modal.onlineusers', {
    modal: {
        type: 'sidebar',
        size: 'small' // full, large, medium, small
    }
});