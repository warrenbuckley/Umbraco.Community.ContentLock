import { customElement, html, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbHeaderAppButtonElement } from '@umbraco-cms/backoffice/components';
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from '@umbraco-cms/backoffice/modal';
import { CONTENTLOCK_USERS_MODAL } from '../modals/users.modal.token';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';

@customElement('contentlock-nousers-online-headerapp')
export class ContentLockNoUsersOnlineHeaderApp extends UmbHeaderAppButtonElement {
	
    @state()
    private _totalConnectedUsers: number | undefined;

    @state()
    private _enableOnlineUsers: boolean = true;

    #modalManagerCtx?: UmbModalManagerContext;
    
	constructor() {
		super();

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrContext: ContentLockSignalrContext) => {
            this.observe(observeMultiple([signalrContext.totalConnectedUsers, signalrContext.EnableOnlineUsers]), ([totalConnectedUsers, enableOnlineUsers]) => {
                this._totalConnectedUsers = totalConnectedUsers;

                // This is an observable from SignalR watching the AppSettings/Options
                // TODO: Perhaps can retire this and use the condition approach when HeaderApps supports it
                // https://github.com/umbraco/Umbraco-CMS/issues/18979
                this._enableOnlineUsers = enableOnlineUsers;
            });
        });

        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (modalManagerCtx) => {
            this.#modalManagerCtx = modalManagerCtx;
        });
	}

    async #openUserListModal() {
        await this.#modalManagerCtx?.open(this, CONTENTLOCK_USERS_MODAL, {
            value: {
                header: this.localize.term('contentLockUsersModal_modalHeader'),
                subHeader: this.localize.term('contentLockUsersModal_listOfUsers'),
                // Do not pass a unique key in, so we get the global list of users
            }
        });
    };

	override render() {

        // TODO: Can remove when HeaderApps support conditions in manifest
        if (!this._enableOnlineUsers) {
            return html ``;
        }

        const badgeValue = this._totalConnectedUsers !== undefined
            ? (this._totalConnectedUsers > 99 ? '99+' : this._totalConnectedUsers.toString())
            : nothing;

		return html`
            <uui-button compact label=${this.localize.term('general_help')} look="primary" @click=${this.#openUserListModal}>
				<uui-icon name="icon-users"></uui-icon>
                <uui-badge color="default" look="secondary">${badgeValue}</uui-badge>
			</uui-button>
        `;
	}

	static override styles = UmbHeaderAppButtonElement.styles;
}

export default ContentLockNoUsersOnlineHeaderApp;

declare global {
	interface HTMLElementTagNameMap {
		'contentlock-nousers-online-headerapp': ContentLockNoUsersOnlineHeaderApp;
	}
}
