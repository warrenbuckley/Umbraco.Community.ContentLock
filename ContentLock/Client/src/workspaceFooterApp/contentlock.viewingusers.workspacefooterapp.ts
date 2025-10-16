import { LitElement, css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import ContentLockSignalrContext from "../globalContexts/contentlock.signalr.context";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UMB_ENTITY_CONTEXT, UmbEntityUnique } from "@umbraco-cms/backoffice/entity";
import { umbOpenModal } from "@umbraco-cms/backoffice/modal";
import { CONTENTLOCK_ONLINEUSERS_MODAL } from "../modals/onlineusers.modal.token";

@customElement('contentlock-viewingusers-workspacefooterapp')
export class ContentLockViewingUsersWorkspaceFooterAppElement extends UmbElementMixin(LitElement) {

    @state()
    private _viewersCount: number = 0;

    @state()
    private _currentUserKey: string | undefined;

    @state()
    private _entityUnique: UmbEntityUnique | undefined;

    private _signalrContext: ContentLockSignalrContext | undefined;

    constructor() {
        super();

        // Get current user context
        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx?.unique, (unique) => {
                this._currentUserKey = unique;
                this._updateViewersCount();
            });
        });

        // Get entity context (content node)
        this.consumeContext(UMB_ENTITY_CONTEXT, (entityCtx) => {
            this.observe(entityCtx?.unique, (unique) => {
                // Stop viewing previous content if any
                if (this._entityUnique && this._signalrContext) {
                    this._signalrContext.stopViewingContent(this._entityUnique.toString());
                }

                this._entityUnique = unique;
                
                // Start viewing new content
                if (this._entityUnique && this._signalrContext) {
                    this._signalrContext.startViewingContent(this._entityUnique.toString());
                }

                this._updateViewersCount();
            });
        });

        // Get SignalR context
        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            this._signalrContext = signalrCtx;

            if (this._entityUnique && this._signalrContext) {
                this._signalrContext.startViewingContent(this._entityUnique.toString());
            }

            this._updateViewersCount();
        });
    }

    private _updateViewersCount() {
        if (this._entityUnique && this._currentUserKey && this._signalrContext) {
            this.observe(
                this._signalrContext.getViewersCountExcludingCurrentUser(this._entityUnique.toString(), this._currentUserKey),
                (count) => {
                    this._viewersCount = count;
                }
            );
        } else {
            this._viewersCount = 0;
        }
    }

    async #openUserListModal() {
        if (!this._entityUnique) return;

        await umbOpenModal(this, CONTENTLOCK_ONLINEUSERS_MODAL, {
            data: {
                contentKey: this._entityUnique?.toString()
            }
        }).catch(() => undefined);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        
        // Stop viewing content when component is disconnected
        if (this._entityUnique && this._signalrContext) {
            this._signalrContext.stopViewingContent(this._entityUnique.toString());
        }
    }

    render() {
        // Only show if there are other users viewing this content
        if (this._viewersCount === 0) {
            return nothing;
        }

        const viewersText = this._viewersCount === 1 
            ? this.localize.term('contentLockViewingUsersFooterApp_oneUserViewing') 
            : this.localize.term('contentLockViewingUsersFooterApp_multipleUsersViewing', this._viewersCount.toString());

        return html`
            <div id="viewing-users" @click=${this.#openUserListModal}>
                <uui-icon name="icon-users"></uui-icon>
                <span>${viewersText}</span>
                <uui-badge color="default" look="secondary">${this._viewersCount}</uui-badge>
            </div>
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding: var(--uui-size-layout-1);
            }

            #viewing-users {
                display: flex;
                align-items: center;
                gap: var(--uui-size-2);
                padding: 4px 14px 4px 10px;
                border-radius: var(--uui-size-4);
                font-size: 12px;
                cursor: pointer;
                background-color: var(--uui-color-surface-alt);
                color: var(--uui-color-default-standalone);
                font-weight: 700;
                transition: background-color 0.2s ease;
            }

            #viewing-users:hover {
                background-color: var(--uui-color-surface-emphasis);
            }

            uui-badge {
                z-index: 9999;
            }

            uui-icon {
                font-size: var(--uui-size-4);
            }
        `,
    ];
}

export default ContentLockViewingUsersWorkspaceFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-viewingusers-workspacefooterapp': ContentLockViewingUsersWorkspaceFooterAppElement;
    }
}