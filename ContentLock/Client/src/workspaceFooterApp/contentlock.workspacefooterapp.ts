import { LitElement, css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";
import PageState from "../enums/PageStateEnum";
import { UserBasicInfo } from '../interfaces/UserBasicInfo';
import { UMB_CURRENT_USER_CONTEXT, UmbCurrentUserContext } from '@umbraco-cms/backoffice/current-user';
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from '@umbraco-cms/backoffice/modal';
import { CONTENTLOCK_ONLINEUSERS_MODAL } from '../modals/onlineusers.modal.token';

@customElement('contentlock-workspacefooterapp')
export class ContentLockWorkspaceFooterAppElement extends UmbElementMixin(LitElement) {

    @state()
	private pageState: PageState;

    @state()
    private _lockedByName: string | null | undefined;

    @state()
    private _isLocked: boolean | undefined;

    @state()
    private _isLockedBySelf: boolean | undefined;

    @state()
    private _otherViewers: UserBasicInfo[] = [];

    @state()
    private _currentUserKey?: string;

    private _lockContext: ContentLockWorkspaceContext | undefined;
    #modalManager?: UmbModalManagerContext;

    constructor() {
        super();

        // Set init page state to loading until we get response from API
        this.pageState = PageState.Loading;

        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (manager) => {
            this.#modalManager = manager;
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx: UmbCurrentUserContext) => {
            this.observe(currentUserCtx.unique, (userKey) => {
                this._currentUserKey = userKey;
                // Re-filter viewers if currentUserKey becomes available after viewers were set
                if (this._lockContext) {
                    const viewers = this._lockContext.currentContentViewers.getValue();
                    this._otherViewers = viewers.filter(viewer => viewer.userKey !== this._currentUserKey);
                }
            }, 'observeCurrentUserKey');
        });

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (lockCtx) => {
            this._lockContext = lockCtx;

            // Observe lock state
            this._lockContext?.observe(observeMultiple([this._lockContext?.isLocked, this._lockContext?.isLockedBySelf, this._lockContext?.lockedByName]), ([isLocked, isLockedBySelf, lockedByName]) => {
                this._isLocked = isLocked;
                this._isLockedBySelf = isLockedBySelf;
                this._lockedByName = lockedByName;

                if (this._isLockedBySelf) {
                    this.pageState = PageState.LockedByYou;
                } else if (this._isLocked) {
                    this.pageState = PageState.LockedByAnother;
                } else {
                    this.pageState = PageState.Unlocked;
                }
            }, 'observeLockState');

            // Observe content viewers
            this._lockContext?.observe(this._lockContext.currentContentViewers, (viewers) => {
                if (this._currentUserKey) {
                    this._otherViewers = viewers.filter(viewer => viewer.userKey !== this._currentUserKey);
                } else {
                    this._otherViewers = viewers;
                }
            }, 'observeContentViewers');
        });
    }

    renderLockStatus() {
        switch (this.pageState) {
            case PageState.Loading:
            case PageState.Unlocked:
                return nothing;
            case PageState.LockedByYou:
                return html`
                    <div id="message">
                        ${this.localize.term('contentLockFooterApp_lockedByYou')}
                        <uui-badge color="warning" look="primary" attention>
                            <uui-icon name="icon-lock"></uui-icon>
                        </uui-badge>
                    </div>
                `;
            case PageState.LockedByAnother:
                return html`
                    <div id="message">
                        ${this.localize.term('contentLockFooterApp_lockedByAnother', this._lockedByName)}
                        <uui-badge color="danger" look="primary" attention>
                            <uui-icon name="icon-lock"></uui-icon>
                        </uui-badge>
                    </div>
                `;
            default:
                return nothing;
        }
    }

    async #openViewersModal() {
        if (!this._otherViewers || this._otherViewers.length === 0) return;

        const modalTitle = this.localize.term('contentLockUsersModal_viewingThisDocumentTitle');
        const modalData = {
            usersToShow: this._otherViewers, // _otherViewers is UserBasicInfo[]
            modalTitle: modalTitle
        };

        this.#modalManager?.open(this, CONTENTLOCK_ONLINEUSERS_MODAL, { data: modalData });
    }

    private _renderOtherViewers() {
        if (!this._otherViewers || this._otherViewers.length === 0) {
            return nothing;
        }

        const labelText = `${this.localize.term('contentLockFooterApp_usersViewingThisDocument')}: ${this._otherViewers.length}`;

        return html`
            <uui-button
                id="other-viewers-button"
                look="outline" 
                label=${labelText}
                compact
                @click=${this.#openViewersModal}>
                <uui-icon name="icon-users"></uui-icon>
                <span style="margin-left: var(--uui-size-space-1);">${this._otherViewers.length}</span>
            </uui-button>
        `;
    }

    render() {
        return html`
            ${this.renderLockStatus()}
            ${this._renderOtherViewers()}
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: flex; /* Use flexbox for alignment */
                justify-content: flex-end; /* Align items to the right */
                align-items: center; /* Vertically center items */
                gap: var(--uui-size-space-2); /* Add space between items */
                padding: var(--uui-size-space-3);
            }

            uui-badge {
                margin-left: var(--uui-size-space-2); 
            }

            #message {
                display: inline-block; 
                padding: var(--uui-size-space-1) var(--uui-size-space-3);
                border-radius: var(--uui-border-radius);
                font-size: var(--uui-type-small-size); 
                font-weight: bold; 
                background-color: var(--uui-color-surface-alt);
                color: var(--uui-color-text);
                /* margin-top is removed as flex handles vertical alignment */
            }

            #other-viewers-button {
                /* Styles for the button if needed, uui-button defaults are usually fine */
                /* Example: margin-left: var(--uui-size-space-2); if #message is also present */
            }
        `,
    ];
}

export default ContentLockWorkspaceFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-workspacefooterapp': ContentLockWorkspaceFooterAppElement;
    }
}