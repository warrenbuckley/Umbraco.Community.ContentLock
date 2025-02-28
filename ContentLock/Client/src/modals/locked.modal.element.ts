import { customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { umbFocus } from "@umbraco-cms/backoffice/lit-element";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { LockedModalData, LockedModalValue } from "./locked.modal.token";

@customElement('locked-content-modal')
export class LockedContentModalElement extends UmbModalBaseElement<LockedModalData, LockedModalValue>
{
    private handleClose() {
        this._submitModal();
    }
    
    render() {
        return html`
            <uui-dialog-layout class="uui-text" headline="🛡️ Content Lock - This page is locked">
                This page is currently locked by <strong>${this.data?.lockedBy}</strong>
				
                <uui-button
					slot="actions"
					label="Ok"
                    look="primary"
                    color="default"
                    @click=${this.handleClose}
                    ${umbFocus()}></uui-button>

			</uui-dialog-layout>
        `;
    }
}

export default LockedContentModalElement;
