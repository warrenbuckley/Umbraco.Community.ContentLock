import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ScreenShareModalData {
}

export interface ScreenShareModalValue {
}

export const CONTENTLOCK_SCREENSHARE_MODAL = new UmbModalToken<ScreenShareModalData, ScreenShareModalValue>('contentlock.modal.screenshare', {
    modal: {
        type: 'dialog',
    }
});
