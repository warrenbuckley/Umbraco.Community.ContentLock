import { css, customElement, html, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { UsersModalData, UsersModalValue } from "./users.modal.token";
import { UmbUserItemModel, UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<UsersModalData, UsersModalValue>
{
    @state()
    _usersModels?: UmbUserItemModel[] = [];

    @state()
    _userKeys?: string[];

    @state()
    _currentUserKey?: string;

    #userItemRepository = new UmbUserItemRepository(this);

    #signalrCtx?: ContentLockSignalrContext;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();

        // Use connectedCallback and not the ctor
        // As the .value object we pass in to the modal is not available in the constructor at that point in lifecycle

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.unique, (unique) => {
                this._currentUserKey = unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            this.#signalrCtx = signalrCtx;

            // If we have a unique key set when opening the modal as a value 
            // we want to see the list of users that are viewing the same node
            if(this.value.unique){
                this.#getUsersForNode(this.value.unique);
            }
            else {
                // No unique key passed in
                // so this means this use is for the global list of connected users
                this.#getConnectedBackofficeUsers();
            }
        });
    }

    #getConnectedBackofficeUsers() {
        if(!this.#signalrCtx) {
            console.warn('No Content Lock SignalR context available');
            return;
        }

        this.observe(this.#signalrCtx.connectedUserKeys, async (globalConnectedUserKeys)=>{
            this._userKeys = globalConnectedUserKeys;
            this.#fetchUsers();
        });
    }

    async #getUsersForNode(uniqueKey: string) {
        console.log('GET USERS for node with unique key:', uniqueKey);

        if(!this.#signalrCtx) {
            console.warn('No Content Lock SignalR context available');
            return;
        }

        // TODO: from SignalR ctx or similar
        // this.observe(this.#signalrCtx.getUsersForNode(uniqueKey), async (usersForNode) => {
        //     console.log('Users for node:', usersForNode);

        //     this._userKeys = globalConnectedUserKeys;
        //     this.#fetchUsers();
        // });
    }
    
    async #fetchUsers() {
        if (!this._userKeys || this._userKeys.length === 0) {
            console.warn('No user keys available to fetch users');
            return;
        }

        // Get users from the repo and observe it
        const userItemsObservable = (await this.#userItemRepository.requestItems(this._userKeys)).asObservable();

        // Observe the users we wanted to request/fetch and assign them to property/state
        this.observe(userItemsObservable, (userItems) => {
            this._usersModels = userItems;
        });
    }

    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        return html`
            <umb-body-layout headline=${this.value.header}>
                <uui-box headline=${this.value.subHeader}>
                    ${this._usersModels?.map((user) => {
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
                    <uui-button id="close" label="Close" @click=${this.#handleClose}>
                        <umb-localize key="general_close">Close</umb-localize>
                    </uui-button>
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