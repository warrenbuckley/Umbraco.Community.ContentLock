import { customElement, html, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbHeaderAppButtonElement } from '@umbraco-cms/backoffice/components';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { CONTENTLOCK_ONLINEUSERS_MODAL } from '../modals/onlineusers.modal.token';

@customElement('contentlock-nousers-online-headerapp')
export class ContentLockNoUsersOnlineHeaderApp extends UmbHeaderAppButtonElement {
	
    @state()
    private _totalConnectedUsers: number | undefined;

	constructor() {
		super();

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrContext) => {
            if (!signalrContext) {
                console.warn('Content Lock SignalR Context is not available');
                return;
            }

            this.observe(signalrContext.totalConnectedUsers, (totalConnectedUsers) => {
                this._totalConnectedUsers = totalConnectedUsers;
            });
        });
	}

    async #openUserListModal() {
        await umbOpenModal(this, CONTENTLOCK_ONLINEUSERS_MODAL)
            .catch(() => undefined);
    };

	override render() {
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
