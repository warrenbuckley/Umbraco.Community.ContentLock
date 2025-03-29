import { css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    constructor() {
        super();
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        return html`
            <umb-body-layout headline="Who is online?">
                <uui-box headline="Online Users">
                    ${this.data?.users.map((user) => {
                        return html`
                            <div>
                                <uui-avatar name="${user.userName}"></uui-avatar> ${user.userName}
                            </div>
                        `;
                    })}
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

        div {
            margin: var(--uui-size-5) 0;
        }
    `;
}

export default OnlineUsersModalElement;