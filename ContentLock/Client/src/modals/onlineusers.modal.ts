import { css, customElement, html, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";
import { UMB_USER_DETAIL_STORE_CONTEXT, UmbUserItemModel } from "@umbraco-cms/backoffice/user";
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    @state()
    _allUsersModels?: UmbUserItemModel[] = [];

    @state()
    _connectedUsersModels?: UmbUserItemModel[] = [];

    @state()
    _connectedUserKeys: string[] = [];

    constructor() {
        super();

        this.consumeContext(UMB_USER_DETAIL_STORE_CONTEXT, (userDetailStore) => {
            this.observe(userDetailStore.all(), (allUsers) => {
                console.log('OBSERVED allUsers', allUsers);
                this._allUsersModels = allUsers;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrContext: ContentLockSignalrContext) => {
            this.observe(signalrContext.connectedUserKeys, (connectedUserKeys) => {
                console.log('KEYS from Global CTX in MODAL', connectedUserKeys);
                this._connectedUserKeys = connectedUserKeys;

                if(!this._allUsersModels) {
                    console.error('No allUsersModels found, cannot filter connected users');
                    return;
                }

                // Add filtering to only get the connected users
                this._connectedUsersModels = this._allUsersModels?.filter((user) => this._connectedUserKeys.includes(user.unique));
                console.log('OBSERVED filtered users', this._connectedUsersModels);
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
                    ${this._connectedUsersModels?.map((user) => {
                        console.log('User to output to HTML', user);
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