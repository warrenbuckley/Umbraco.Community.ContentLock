import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import { Observable } from "@umbraco-cms/backoffice/observable-api";

export interface UsersModalData {
}

export interface UsersModalValue {
    header: string;
    subHeader: string;
    
    // TODO: Pass in an obseravble of users keys
    // Can be an observabel array of all connected users to backoffice
    // or an observable of users that are viewing the same node
    usersKeys?: Observable<string[]>;
}

export const CONTENTLOCK_USERS_MODAL = new UmbModalToken<UsersModalData, UsersModalValue>('contentlock.modal.users', {
    modal: {
        type: 'sidebar',
        size: 'small' // full, large, medium, small
    }
});