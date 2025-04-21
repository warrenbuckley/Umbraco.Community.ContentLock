import { css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";
import { UMB_USER_ITEM_STORE_CONTEXT, UmbUserItemModel } from "@umbraco-cms/backoffice/user";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    #users?: UmbUserItemModel[] = [];

    constructor() {
        super();
        
        // From the modal data passed in
        // Convert to an array of string GUIDs for the user keys
        const userKeys = this.data?.users.map((user) => user.userKey) ?? [];

        this.consumeContext(UMB_USER_ITEM_STORE_CONTEXT, (userStore) => {
            this.observe(userStore.items(userKeys), (users) => {
                this.#users = users;
            });
        });
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        return html`
            <umb-body-layout headline=${this.localize.term('contentLockUsersModal_modalHeader')}>
                <uui-box headline=${this.localize.term('contentLockUsersModal_listOfUsers')}>
                    ${this.#users?.map((user) => {
                        return html`
                            <div>
                                <uui-avatar name="${user.name}" img-src="${user.avatarUrls[0]}"></uui-avatar> ${user.name}
                            </div>
                        `;
                    })}
                </uui-box>
                
                <div slot="actions">
                    <uui-button id="close" label="Close" @click=${this.#handleClose}>${this.localize.term('general_close')}</uui-button>
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