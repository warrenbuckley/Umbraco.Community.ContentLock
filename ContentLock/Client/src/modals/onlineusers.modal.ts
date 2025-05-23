import { css, customElement, html, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";
import { UmbUserItemModel, UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UserBasicInfo } from "../interfaces/UserBasicInfo";

type OnlineUsersModalMode = 'specificUsers' | 'allConnectedUsers';

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    @state()
    _connectedUsersModels: UmbUserItemModel[] = [];

    @state()
    _currentUserKey?: string;

    @state()
    private _mode: OnlineUsersModalMode = 'allConnectedUsers'; // Default mode

    @state()
    private _headline: string = '';


    #userItemRepository = new UmbUserItemRepository(this);

    constructor() {
        super();

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.unique, (unique) => {
                this._currentUserKey = unique;
            }, 'observeCurrentUser');
        });
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._processData();
    }
    
    private _processData() {
        this._headline = this.data?.modalTitle 
            ? this.data.modalTitle 
            : this.localize.term('contentLockUsersModal_modalHeader');

        if (this.data?.usersToShow && this.data.usersToShow.length > 0) {
            this._mode = 'specificUsers';
            const userKeys = this.data.usersToShow.map(u => u.userKey);
            this.#loadUsersFromKeys(userKeys);
        } else {
            this._mode = 'allConnectedUsers';
            // Fallback to existing logic: observe all connected users from SignalR
            this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx: ContentLockSignalrContext) => {
                this.observe(signalrCtx.connectedUserKeys, (connectedUserKeys) => {
                    this.#loadUsersFromKeys(connectedUserKeys);
                }, 'observeConnectedUserKeys');
            });
        }
    }

    async #loadUsersFromKeys(userKeys: string[]) {
        if (!userKeys || userKeys.length === 0) {
            this._connectedUsersModels = [];
            return;
        }
        
        // UmbUserItemRepository.requestItems returns a promise that resolves to an object with a 'data' observable
        try {
            const { data: usersObservable } = await this.#userItemRepository.requestItems(userKeys);
            
            if (usersObservable) {
                this.observe(usersObservable, (userItems) => {
                    this._connectedUsersModels = userItems;
                }, 'observeUserItems');
            } else {
                this._connectedUsersModels = [];
            }
        } catch (error) {
            console.error("Error loading users from keys:", error);
            this._connectedUsersModels = [];
        }
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        return html`
            <umb-body-layout headline=${this._headline}>
                <uui-box headline=${this.localize.term('contentLockUsersModal_listOfUsers')}>
                    ${this._connectedUsersModels && this._connectedUsersModels.length > 0
                        ? this._connectedUsersModels.map((user) => {
                            return html`
                            <div class="user-detail">
                                <umb-user-avatar name="${user.name}" .imgUrls=${user.avatarUrls ?? []}></umb-user-avatar>
                                <span>${user.name}</span>
                                
                                <!-- Show a tag if the user is the current user -->
                                ${user.unique === this._currentUserKey
                                    ? html `<uui-tag color="default" look="outline">${this.localize.term('general_you')}</uui-tag>`
                                    : nothing
                                }
                            </div>
                        `;
                        })
                        : html`<p>${this.localize.term('contentLockUsersModal_noUsers')}</p>`
                    }
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