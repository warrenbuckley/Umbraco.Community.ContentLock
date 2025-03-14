import { LitElement, css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UUIButtonElement } from "@umbraco-cms/backoffice/external/uui";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentWorkspaceContext } from "@umbraco-cms/backoffice/document";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import PageState from "../enums/PageStateEnum";
import { ContentLockService } from "../api";
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";

@customElement('contentlock-workspaceview')
export class ContentLockWorkspaceViewElement extends UmbElementMixin(LitElement) {

    @state()
	private pageState: PageState;

    @state()
    private _lockedByName: string | null | undefined;

    @state()
    private _isLocked: boolean | undefined;

    @state()
    private _lockedBySelf: boolean | undefined;

    private _notificationCtx?: UmbNotificationContext;
    private _docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    private _unique: string | null | undefined;
    private _contentLockCtx?: ContentLockWorkspaceContext;

    constructor() {
        super();

        // Set init page state to loading until we get response from API
        this.pageState = PageState.Loading;

        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this._notificationCtx = notificationCtx;
        });

        this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (docWorkspaceCtx) => {
            this._docWorkspaceCtx = docWorkspaceCtx;
            this._unique = this._docWorkspaceCtx?.getUnique();
        });

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (contentLockCtx) => {
            this._contentLockCtx = contentLockCtx;

            // Observe the content lock context obswervables
            this.observe(observeMultiple([this._contentLockCtx.isLocked, this._contentLockCtx.lockedByName, this._contentLockCtx.isLockedBySelf]),([isLocked, lockedBy, isLockedBySelf]) =>{
                this._isLocked = isLocked;
                this._lockedByName = lockedBy;
                this._lockedBySelf = isLockedBySelf;
            });


            if(this._isLocked == false){
                this.pageState = PageState.Unlocked;
            }

            if(this._isLocked == true && this._lockedBySelf == true){
                this.pageState = PageState.LockedByYou;
            }

            if(this._isLocked == true && this._lockedBySelf == false){
                this.pageState = PageState.LockedByAnother;
            }
        });
    }

    private async _lock(ev: Event) {
        if (!this._unique) {
            console.error('No unique key found');
            return;
        }

        const buttonElement = ev.target as UUIButtonElement;
        buttonElement.state = 'waiting';

        const { error } = await ContentLockService.lockContent({path:{key:this._unique}});
        if (error){
            buttonElement.state = 'failed';
            console.error(error);
            return;
        }

        // Set button to success
        buttonElement.state = 'success';

        // Update the page state
        this.pageState = PageState.LockedByYou;

        // Show success notficiation saying page is now locked
        this._notificationCtx?.peek('positive', {
            data: {
                headline: 'Page Locked',
                message: 'You have successfully locked the page'
            }
        });
    }

    private async _unlock(ev: Event) {
        if (!this._unique) {
            console.error('No unique key found');
            return;
        }

        const buttonElement = ev.target as UUIButtonElement;
        buttonElement.state = 'waiting';

        const { error } = await ContentLockService.unlockContent({path:{key:this._unique}});
        if (error){
            buttonElement.state = 'failed';
            console.error(error);
            return;
        }

        // Set button to success
        buttonElement.state = 'success';

        // Update the page state to be unlocked
        this.pageState = PageState.Unlocked;

        // Show success notification that oage is unlocked
        this._notificationCtx?.peek('positive', {
            data: {
                headline: 'Page Unlocked',
                message: 'You have successfully unlocked the page'
            }
        });
    }

    render() {

        switch (this.pageState) {

             // Locked by another user (Readonly)
             case PageState.Loading:
                return html`
                    <uui-box class="entries">
                        <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Lock/Unlock</span>
                        <div class="grid">
                            <div>
                                <uui-loader></uui-loader>
                            </div>
                            <div>
                                <img src="/App_Plugins/ContentLock/images/protection.png" />
                            </div>
                        </div>
                    </uui-box>
			    `;

            // Locked by another user (Readonly)
            case PageState.LockedByAnother:
                return html`
                    <uui-box class="entries">
                        <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Lock/Unlock</span>

                        <div class="grid">
                            <div>
                                <h2>This page is currently <uui-icon name="icon-combination-lock"></uui-icon> <span>locked</span> by ${this._lockedByName}</h2>
                                <p>You cannot edit the content of this page</p>
                            </div>
                            <div>
                                <img src="/App_Plugins/ContentLock/images/protection.png" />
                            </div>
                        </div>
                    </uui-box>
			    `;

            // Locked by yourself/current user
            case PageState.LockedByYou:
                return html`
                    <uui-box class="entries">
                        <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Lock/Unlock</span>
                        <div class="grid">
                            <div>
                                <h2>This page is currently <uui-icon name="icon-combination-lock"></uui-icon> <span>locked</span> by you</h2>
                                <p>You are now free to edit the content of this page.<br/>
                                Content Lock blocks other editors from accessing the page and prevents overwriting changes.</p>
                                <p>
                                    <uui-button look="primary" @click=${(ev: Event) => this._unlock(ev)}>
                                        <uui-icon name="icon-combination-lock-open"></uui-icon> Unlock page
                                    </uui-button>
                                </p>
                            </div>
                            <div>
                                <img src="/App_Plugins/ContentLock/images/protection.png" />
                            </div>
                        </div>
                    </uui-box>
                `;

            // Not locked by anyone
            case PageState.Unlocked:
                return html`
                    <uui-box class="entries">
                        <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Lock/Unlock</span>
                        <div class="grid">
                            <div>
                                <h2>This page is not locked</h2>
                                <p>If yount to lock it, press the button. You'll be free to edit the content of this page.<br/>
                                Content Lock will block other editors from accessing the page and prevents overwriting changes.</p>
                                <p>
                                    <uui-button look="primary" @click=${(ev: Event) => this._lock(ev)}>
                                        <uui-icon name="icon-combination-lock"></uui-icon> Lock page for other editors
                                    </uui-button>
                                </p>
                            </div>
                            <div>
                                <img src="/App_Plugins/ContentLock/images/protection.png" />
                            </div>
                        </div>
                    </uui-box>
                `;

            // In theory should not get here
            default:
                return nothing;
        }
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding: var(--uui-size-layout-1);
            }

            uui-box {
                margin-bottom: var(--uui-size-layout-1);
            }
            .grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: var(--uui-size-layout-1);            
            }

            .grid img {
                width: 100%;
                object-fit: contain;
                max-width: 100%;
                height: auto;
            }

            h2 {
                font-weight: 400;
            }

            h2 > span {
                font-weight: 600;
            }

            uui-icon {
                vertical-align: top;
            }
        `,
    ];
}

export default ContentLockWorkspaceViewElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-workspaceview': ContentLockWorkspaceViewElement;
    }
}