import { customElement, html, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbHeaderAppButtonElement } from '@umbraco-cms/backoffice/components';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from '@umbraco-cms/backoffice/modal';
import { CONTENTLOCK_ONLINEUSERS_MODAL } from '../modals/onlineusers.modal.token';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
import { ConnectedBackofficeUsers } from '../interfaces/ConnectedBackofficeUsers';

@customElement('contentlock-nousers-online-headerapp')
export class ContentLockNoUsersOnlineHeaderApp extends UmbHeaderAppButtonElement {
	
    @state()
    private _totalConnectedUsers: number | undefined;

    @state()
    private _connectedUsers?: ConnectedBackofficeUsers[];

    @state()
    private _enableOnlineUsers: boolean = true;

    #modalManagerCtx?: UmbModalManagerContext;
    

	constructor() {
		super();

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrContext) => {
            this.observe(observeMultiple([signalrContext.totalConnectedUsers, signalrContext.connectedUsers, signalrContext.EnableOnlineUsers]), ([totalConnectedUsers, connectedUsers, enableOnlineUsers]) => {
                this._totalConnectedUsers = totalConnectedUsers;
                this._connectedUsers = connectedUsers;

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
        await this.#modalManagerCtx?.open(this, CONTENTLOCK_ONLINEUSERS_MODAL, { 
            data: {
                users: this._connectedUsers ?? []
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
