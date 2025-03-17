import { LitElement, css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";
import PageState from "../enums/PageStateEnum";

@customElement('contentlock-workspacefooterapp')
export class ContentLockWorkspaceVFooterAppElement extends UmbElementMixin(LitElement) {

    @state()
	private pageState: PageState;

    @state()
    private _lockedByName: string | null | undefined;

    @state()
    private _isLocked: boolean | undefined;

    @state()
    private _isLockedBySelf: boolean | undefined;

    private _lockContext: ContentLockWorkspaceContext | undefined;

    constructor() {
        super();

        // Set init page state to loading until we get response from API
        this.pageState = PageState.Loading;

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (lockCtx) => {

            this._lockContext = lockCtx;

            // Observe the many observables from lock context
            // So this reacts when we move between locked states for future SignalR work
            this._lockContext?.observe(observeMultiple([this._lockContext?.isLocked, this._lockContext?.isLockedBySelf, this._lockContext?.lockedByName]), ([isLocked, isLockedBySelf, lockedByName]) => {
                this._isLocked = isLocked;
                this._isLockedBySelf = isLockedBySelf;
                this._lockedByName = lockedByName;

                if (this._isLockedBySelf) {
                    this.pageState = PageState.LockedByYou;
                }
                else if (this._isLocked) {
                    this.pageState = PageState.LockedByAnother;
                }
                else {
                    this.pageState = PageState.Unlocked;
                }
            });
        });
    }


    render() {

        switch (this.pageState) {
            case PageState.Loading | PageState.Unlocked:
                return nothing;
            
            case PageState.LockedByYou:
                return html `
                    <div id="message">
                        This page is locked by you
                        <uui-badge color="warning" look="primary" attention>
                            <uui-icon name="icon-lock"></uui-icon>
                        </uui-badge>
                    </div>
                `;
            
            case PageState.LockedByAnother:
                return html `
                    <div id="message">
                        This Page is locked by ${this._lockedByName}
                        <uui-badge color="danger" look="primary" attention>
                            <uui-icon name="icon-lock"></uui-icon>
                        </uui-badge>
                    </div>
                `;
        };
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding: var(--uui-size-layout-1);
            }

            uui-badge {
                z-index: 9999;
            }

            #message {
                padding:4px 14px 4px 10px;
                border-radius: var(--uui-size-4);
                font-size: 12px;
                position:relative;

                background-color: var(--uui-color-surface-alt);
                color: var(--uui-color-default-standalone);
                font-weight: 700;
            }
        `,
    ];
}

export default ContentLockWorkspaceVFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-workspacefooterapp': ContentLockWorkspaceVFooterAppElement;
    }
}