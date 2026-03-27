import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { umbOpenModal } from "@umbraco-cms/backoffice/modal";
import { CONTENTLOCK_SCREENSHARE_MODAL } from "../modals/screenshare.modal.token";
import { CONTENTLOCK_WEBRTC_CONTEXT } from "../globalContexts/contentlock.webrtc.context";

interface ScreenShareNotificationData {
    sharerKey: string;
    sharerName: string;
}

/**
 * Toast notification shown to the viewer when a call participant starts sharing their screen.
 * "View Screen" opens the full-screen screen share modal.
 * "Dismiss" closes the notification without action.
 */
@customElement('contentlock-screenshare-notification')
export class ContentLockScreenShareNotificationElement extends UmbLitElement {

    @property({ attribute: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notificationHandler?: any;

    @property({ type: Object })
    data!: ScreenShareNotificationData;

    @state()
    private _opening = false;

    constructor() {
        super();

        this.consumeContext(CONTENTLOCK_WEBRTC_CONTEXT, (ctx) => {
            if (!ctx) return;

            // Auto-dismiss if the screen share ends while the notification is still showing
            this.observe(ctx.screenShareState, (shareState) => {
                if (shareState === 'idle') {
                    this.notificationHandler?.close();
                }
            });
        });
    }

    async #handleViewScreen() {
        this._opening = true;
        this.notificationHandler?.close();
        try {
            await umbOpenModal(this, CONTENTLOCK_SCREENSHARE_MODAL, { data: {} });
        } catch {
            // Modal was closed/rejected — normal flow
        }
        this._opening = false;
    }

    #handleDismiss() {
        this.notificationHandler?.close();
    }

    override render() {
        const name = this.data?.sharerName ?? 'Someone';

        return html`
            <uui-toast-notification-layout class="uui-text">
                <div id="share-info">
                    <uui-icon name="icon-screen"></uui-icon>
                    <div id="share-text">
                        <strong>${name}</strong>
                        <span>
                            <umb-localize key="contentLockCall_sharingScreen" .args=${[name]}>
                                is sharing their screen
                            </umb-localize>
                        </span>
                    </div>
                </div>
                <div slot="actions">
                    <uui-button
                        color="positive"
                        look="primary"
                        label="${this.localize.term('contentLockCall_viewScreen')}"
                        .state=${this._opening ? 'waiting' : ''}
                        @click=${this.#handleViewScreen}>
                        <uui-icon name="icon-eye"></uui-icon>
                        <umb-localize key="contentLockCall_viewScreen">View Screen</umb-localize>
                    </uui-button>
                    <uui-button
                        look="outline"
                        label="Dismiss"
                        @click=${this.#handleDismiss}>
                        <umb-localize key="general_dismiss">Dismiss</umb-localize>
                    </uui-button>
                </div>
            </uui-toast-notification-layout>
        `;
    }

    static styles = css`
        :host {
            display: block;
        }

        #share-info {
            display: flex;
            align-items: center;
            gap: var(--uui-size-4);
            margin-bottom: var(--uui-size-4);
        }

        #share-info uui-icon {
            font-size: 2rem;
            flex-shrink: 0;
        }

        #share-text {
            display: flex;
            flex-direction: column;
            font-size: var(--uui-type-default-size);
        }
    `;
}

export default ContentLockScreenShareNotificationElement;
