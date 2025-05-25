import { css, customElement, html, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { UmbUserItemModel, UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { ViewingUsersModalData, ViewingUsersModalValue } from "./viewingusers.modal.token";
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from "../../globalContexts/contentlock.signalr.context";

@customElement("contentlock-viewingusers-modal")
export class ViewingUsersModalElement extends UmbModalBaseElement<ViewingUsersModalData, ViewingUsersModalValue>
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
            this.observe(currentUserCtx.unique, (unique) => {
                this._currentUserKey = unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx: ContentLockSignalrContext) => {

            // TODO: Observe something NEW from Global SignalR context
            // Perhaps the modal is given the current node GUID
            // Then we can call something like signalrCtx.whosOnThisNode(nodeGuid)

            // Then a new context for content workspace so we know what node a user is looking at ?
            // We already have our own workspace context - when it loads in we can 
            // push to SignalR hub who we are and what node we are on
            // When context removed/destoryed we can tell the hub we are no longer on that node

            // The list of GUID connected users as keys/uniques
            this.observe(signalrCtx.connectedUserKeys, async (connectedUserKeys) => {
                this._connectedUserKeys = connectedUserKeys;

                // Get users from the repo and observe it
                // TODO: Why does it not work when a user updates their name or avatar?
                // However when new user logs in or out it reactively shows them with the model open
                const userItemsObservable = (await this.#userItemRepository.requestItems(connectedUserKeys)).asObservable();

                // Observe the users we wanted to request/fetch and assign them to property/state
                this.observe(userItemsObservable, (userItems) => {
                    this._connectedUsersModels = userItems;
                });
            });
        });
    }
    
    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }
    
    render() {
        return html`
            <umb-body-layout headline='Whos Here?'>
                <uui-box headline='Users viewing this node'>
                    ${this._connectedUsersModels?.map((user) => {
                        return html`
                            <div class="user-detail">
                                <umb-user-avatar name="${user.name}" .imgUrls=${user.avatarUrls ?? []}></umb-user-avatar>
                                <span>${user.name}</span>
                                
                                <!-- Show a tag if the user is the current user -->
                                ${user.unique === this._currentUserKey
                                    ? html `<uui-tag color="default" look="outline">You</uui-tag>`
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

export default ViewingUsersModalElement;