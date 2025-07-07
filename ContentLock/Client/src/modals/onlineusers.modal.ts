import { css, customElement, html, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";
import { UmbUserItemModel, UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    @state()
    _connectedUsersModels?: UmbUserItemModel[] = [];

    @state()
    _connectedUserKeys: string[] = [];

    @state()
    _currentUserKey?: string;

    #userItemRepository = new UmbUserItemRepository(this);

    constructor() {
        super();

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx?.unique, (unique) => {
                this._currentUserKey = unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            if (this.data?.contentKey) {
                // Show users viewing specific content
                this.observe(signalrCtx?.getUsersViewingContent(this.data.contentKey), async (viewingUserKeys) => {
                    if(viewingUserKeys) {
                        this._connectedUserKeys = viewingUserKeys;

                        // Get users from the repo
                        const userItems = (await this.#userItemRepository.requestItems(viewingUserKeys));
                        this._connectedUsersModels = userItems?.data;
                    }
                });
            } else {
                // Show all connected users (original behavior)
                this.observe(signalrCtx?.connectedUserKeys, async (connectedUserKeys) => {
                    if(connectedUserKeys) {
                        this._connectedUserKeys = connectedUserKeys;

                        // Get users from the repo
                        const userItems = (await this.#userItemRepository.requestItems(connectedUserKeys));
                        this._connectedUsersModels = userItems?.data;
                    }
                });
            }
        });
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        const isContentSpecific = !!this.data?.contentKey;
        const modalHeader = isContentSpecific 
            ? this.localize.term('contentLockViewingUsersModal_modalHeader')
            : this.localize.term('contentLockUsersModal_modalHeader');
        const listHeader = isContentSpecific 
            ? this.localize.term('contentLockViewingUsersModal_listOfViewers')
            : this.localize.term('contentLockUsersModal_listOfUsers');

        return html`
            <umb-body-layout headline=${modalHeader}>
                <uui-box headline=${listHeader}>
                    ${this._connectedUsersModels?.map((user) => {
                        return html`
                            <div class="user-detail">
                                <umb-user-avatar name="${user.name}" .imgUrls=${user.avatarUrls ?? []}></umb-user-avatar>
                                <span>${user.name}</span>
                                
                                <!-- Show a tag if the user is the current user -->
                                ${user.unique === this._currentUserKey
                                    ? html `<uui-tag color="default" look="outline"><umb-localize key="contentLockUsersModal_youLabel">You</umb-localize></uui-tag>`
                                    : nothing
                                }
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

        .user-detail {
            display: flex;
            align-items: center;
            gap: var(--uui-size-4);
            margin: var(--uui-size-3) 0;
        }

        .user-detail:last-child {
            margin-bottom: 0;
        }

        uui-avatar {
            font-size: var(--uui-size-6);
        }
    `;
}

export default OnlineUsersModalElement;