import { css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    
    render() {
        return html`
            <umb-body-layout headline="Who is online?">
                
                <uui-box headline="Online Users">
                    <div>
                        <uui-avatar name="Warren Buckley"></uui-avatar> Warren Buckley
                    </div>
                    <div>
                        <uui-avatar name="Warren"></uui-avatar> Emma
                    </div>
                </uui-box>
                
                <div slot="actions">
                    <uui-button id="close" label="Close" @click=${this.#handleClose}>Close</uui-button>
                </div>
            </umb-body-layout>
        `;
    }
    
    static styles = css`
        uui-box {
            margin-bottom: 1rem;
        }

        umb-property-layout {
            padding-top:0;
            padding-bottom:0;
        }
    `;
}

export default OnlineUsersModalElement;