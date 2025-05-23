import { LitElement, css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";
import PageState from "../enums/PageStateEnum";
import { UserBasicInfo } from '../interfaces/UserBasicInfo';
import { UMB_CURRENT_USER_CONTEXT, UmbCurrentUserContext } from '@umbraco-cms/backoffice/current-user';

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

    constructor() {
        super();

        // Set init page state to loading until we get response from API
        this.pageState = PageState.Loading;

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

    renderOtherViewers() {
        if (this._otherViewers.length === 0) {
            return nothing;
        }

        const displayNames = this._otherViewers.slice(0, 2).map(viewer => viewer.userName).join(', ');
        const remainingCount = this._otherViewers.length - 2;

        return html`
            <div id="viewers-message">
                <uui-icon name="icon-users"></uui-icon>
                ${this.localize.term('contentLockFooterApp_alsoViewing')}: 
                ${displayNames}
                ${remainingCount > 0
                    ? ` ${this.localize.term('general_and')} ${remainingCount} ${this.localize.term('contentLockFooterApp_others', remainingCount)}`
                    : ''}
            </div>
        `;
    }

    render() {
        return html`
            ${this.renderLockStatus()}
            ${this.renderOtherViewers()}
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding: var(--uui-size-space-3); /* Consistent padding */
                text-align: right; /* Align content to the right */
            }

            uui-badge {
                margin-left: var(--uui-size-space-2); /* Space between text and badge */
            }

            #message, #viewers-message {
                display: inline-block; /* Allow multiple messages on one line if needed, or stack them */
                padding: var(--uui-size-space-1) var(--uui-size-space-3);
                border-radius: var(--uui-border-radius);
                font-size: var(--uui-type-small-size); /* Use Umbraco's small font size */
                font-weight: bold; /* Make text bold */
                background-color: var(--uui-color-surface-alt);
                color: var(--uui-color-text); /* Standard text color */
                margin-top: var(--uui-size-space-2); /* Space between messages if stacked */
            }

            #viewers-message {
                /* Specific styles for viewers message if needed */
                background-color: var(--uui-color-surface-alt); /* Or a different color like info */
                color: var(--uui-color-text);
                margin-left: var(--uui-size-space-2); /* Space from the lock message if on the same line */
            }

            #viewers-message uui-icon {
                margin-right: var(--uui-size-space-1);
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