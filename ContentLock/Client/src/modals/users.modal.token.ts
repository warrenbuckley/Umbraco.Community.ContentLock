import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface UsersModalData {
}

export interface UsersModalValue {
    header: string;
    subHeader: string;
    
    // Optional unique/GUID of the node that the user is on
    // If we do not pass this through we can get the list of all users that are connected to the backoffice
    unique?: string;
}

export const CONTENTLOCK_USERS_MODAL = new UmbModalToken<UsersModalData, UsersModalValue>('contentlock.modal.users', {
    modal: {
        type: 'sidebar',
        size: 'small' // full, large, medium, small
    }
});