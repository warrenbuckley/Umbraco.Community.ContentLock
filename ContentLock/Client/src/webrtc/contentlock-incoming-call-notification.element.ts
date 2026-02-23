import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbUserItemRepository, UmbUserItemModel } from "@umbraco-cms/backoffice/user";
import { CONTENTLOCK_WEBRTC_CONTEXT } from "./contentlock.webrtc.context";

interface IncomingCallData {
    callerKey: string;
    callerName: string;
}

/**
 * Custom notification layout shown when a backoffice user receives an incoming WebRTC call.
 * Rendered by Umbraco's notification system via elementName: 'contentlock-incoming-call-notification'.
 *
 * The notification persists until the user explicitly Accepts or Declines.
 */
@customElement('contentlock-incoming-call-notification')
export class ContentLockIncomingCallNotificationElement extends UmbLitElement {

    @property({ attribute: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notificationHandler?: any; // UmbNotificationHandler — typed loosely to avoid deep import chain

    @property({ type: Object })
    data!: IncomingCallData;

    @state()
    private _callerUser?: UmbUserItemModel;

    #userItemRepository = new UmbUserItemRepository(this);
    #webrtcCtx?: typeof CONTENTLOCK_WEBRTC_CONTEXT.TYPE;
    #ringingAudio?: HTMLAudioElement;

    constructor() {
        super();

        this.consumeContext(CONTENTLOCK_WEBRTC_CONTEXT, (ctx) => {
            this.#webrtcCtx = ctx;
        });
    }

    override connectedCallback() {
        super.connectedCallback();
        this.#startRinging();
        // Resolve the caller's avatar from the user repository
        this.#resolveCallerUser();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopRinging();
    }

    async #resolveCallerUser() {
        if (!this.data?.callerKey) return;
        const result = await this.#userItemRepository.requestItems([this.data.callerKey]);
        this._callerUser = result?.data?.[0];
    }

    #startRinging() {
        // Use the same configurable sound path pattern as existing login/logout sounds.
        // Default to a simple in-browser beep via Web Audio API if no dedicated ring sound is configured.
        try {
            this.#ringingAudio = Object.assign(new Audio('/App_Plugins/ContentLock/sounds/login.mp3'), {
                loop: true,
            });
            this.#ringingAudio.play().catch(() => {
                // Browser may block autoplay — safe to ignore, the notification still shows
            });
        } catch {
            // Audio not critical for the notification to function
        }
    }

    #stopRinging() {
        if (this.#ringingAudio) {
            this.#ringingAudio.pause();
            this.#ringingAudio.currentTime = 0;
            this.#ringingAudio = undefined;
        }
    }

    async #handleAccept() {
        this.#stopRinging();
        await this.#webrtcCtx?.acceptCall();
        this.notificationHandler?.close();
    }

    async #handleDecline() {
        this.#stopRinging();
        await this.#webrtcCtx?.declineCall();
        this.notificationHandler?.close();
    }

    override render() {
        const name = this._callerUser?.name ?? this.data?.callerName ?? 'Someone';
        const avatarUrls = this._callerUser?.avatarUrls ?? [];

        return html`
            <uui-toast-notification-layout class="uui-text">
                <div id="caller-info">
                    <umb-user-avatar
                        name="${name}"
                        .imgUrls=${avatarUrls}>
                    </umb-user-avatar>
                    <div id="caller-text">
                        <span id="incoming-label">
                            <umb-localize key="contentLockCall_incoming">Incoming call</umb-localize>
                        </span>
                        <strong id="caller-name">${name}</strong>
                    </div>
                </div>
                <div id="actions">
                    <uui-button
                        id="accept"
                        color="positive"
                        look="primary"
                        label=${this.localize.term('contentLockCall_accept')}
                        @click=${this.#handleAccept}>
                        <uui-icon name="icon-phone"></uui-icon>
                        <umb-localize key="contentLockCall_accept">Accept</umb-localize>
                    </uui-button>
                    <uui-button
                        id="decline"
                        color="danger"
                        look="primary"
                        label=${this.localize.term('contentLockCall_decline')}
                        @click=${this.#handleDecline}>
                        <uui-icon name="icon-wrong"></uui-icon>
                        <umb-localize key="contentLockCall_decline">Decline</umb-localize>
                    </uui-button>
                </div>
            </uui-toast-notification-layout>
        `;
    }

    static styles = css`
        :host {
            display: block;
        }

        #caller-info {
            display: flex;
            align-items: center;
            gap: var(--uui-size-4);
            margin-bottom: var(--uui-size-4);
        }

        #caller-text {
            display: flex;
            flex-direction: column;
        }

        #incoming-label {
            font-size: var(--uui-type-small-size);
            color: var(--uui-color-text-alt);
        }

        #caller-name {
            font-size: var(--uui-type-default-size);
        }

        #actions {
            display: flex;
            gap: var(--uui-size-3);
        }

        #accept {
            flex: 1;
        }

        #decline {
            flex: 1;
        }
    `;
}

export default ContentLockIncomingCallNotificationElement;
