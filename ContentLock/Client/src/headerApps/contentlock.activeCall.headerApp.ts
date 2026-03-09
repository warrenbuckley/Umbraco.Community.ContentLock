import { css, customElement, html, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbHeaderAppButtonElement } from '@umbraco-cms/backoffice/components';
import { CONTENTLOCK_WEBRTC_CONTEXT } from "../globalContexts/contentlock.webrtc.context";
import type { CallState, RemotePeerInfo } from "../globalContexts/contentlock.webrtc.context";

/**
 * Active call indicator rendered as a header app button.
 *
 * Invisible when idle. When a call is active, shows a compact phone icon + timer
 * in the header bar. Clicking opens a uui-popover-container with full call controls:
 * mute, hang-up, and device settings (always visible).
 *
 * Extends UmbHeaderAppButtonElement so it lives inside the Umbraco app shell,
 * giving it native access to consumeContext() and the uui-icon registry.
 */
@customElement('contentlock-active-call-headerapp')
export class ContentLockActiveCallHeaderApp extends UmbHeaderAppButtonElement {

    @state() private _callState: CallState = 'idle';
    @state() private _remotePeer?: RemotePeerInfo;
    @state() private _isMuted = false;
    @state() private _callDuration = '0:00';
    @state() private _micDevices: MediaDeviceInfo[] = [];
    @state() private _speakerDevices: MediaDeviceInfo[] = [];
    @state() private _selectedMicId = '';
    @state() private _selectedSpeakerId = '';

    @query('#contentlock-call-popover')
    private _popoverEl?: HTMLElement;

    #webrtcCtx?: typeof CONTENTLOCK_WEBRTC_CONTEXT.TYPE;
    #timerInterval?: ReturnType<typeof setInterval>;

    constructor() {
        super();

        this.consumeContext(CONTENTLOCK_WEBRTC_CONTEXT, (ctx) => {
            if (!ctx) return;
            this.#webrtcCtx = ctx;

            this.observe(ctx.callState, (callState) => {
                const prev = this._callState;
                this._callState = callState;

                if (callState === 'connected' && prev !== 'connected') {
                    this.#startTimer();
                    this.#loadAudioDevices();
                    // Auto-open the popover after the element re-renders with the connected template
                    this.updateComplete.then(() => {
                        (this._popoverEl as HTMLElement & { showPopover?(): void })?.showPopover?.();
                    });
                } else if (callState === 'idle') {
                    this.#stopTimer();
                    this._callDuration = '0:00';
                }
            });

            this.observe(ctx.remotePeer, (peer) => { this._remotePeer = peer; });
            this.observe(ctx.isMuted, (muted) => { this._isMuted = muted; });
        });
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopTimer();
    }

    // ── Call Timer ─────────────────────────────────────────────────────

    #startTimer() {
        this.#timerInterval = setInterval(() => {
            const start = this.#webrtcCtx?.getCallStartTime();
            if (!start) return;
            const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this._callDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    #stopTimer() {
        clearInterval(this.#timerInterval);
        this.#timerInterval = undefined;
    }

    // ── Audio Devices ──────────────────────────────────────────────────

    async #loadAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this._micDevices = devices.filter((d) => d.kind === 'audioinput');
            this._speakerDevices = devices.filter((d) => d.kind === 'audiooutput');
        } catch {
            // enumerateDevices may fail if permissions are denied
        }
    }

    #handleDeviceChange() {
        this.#webrtcCtx?.setAudioDevices(this._selectedMicId, this._selectedSpeakerId);
    }

    // ── Rendering ──────────────────────────────────────────────────────

    override render() {
        // Nothing shown when not in a call; incoming calls handled by the toast notification
        if (this._callState === 'idle' || this._callState === 'incoming') return html``;

        // When calling another user
        if (this._callState === 'calling') {
            return html`
                <uui-button
                    compact
                    look="primary"
                    popovertarget="contentlock-call-popover"
                    label="${this.localize.term('contentLockCall_callButton')}">
                    <uui-icon class="calling-icon" name="icon-phone"></uui-icon>
                </uui-button>
                <uui-popover-container id="contentlock-call-popover" placement="bottom-end" margin="6">
                    <umb-popover-layout>
                        <div id="panel-content">
                            <div id="panel-header">
                                <umb-user-avatar name="${this._remotePeer?.name ?? ''}" .imgUrls=${[]}></umb-user-avatar>
                                <div id="peer-info">
                                    <strong>${this._remotePeer?.name}</strong>
                                    <span class="calling-label">
                                        <umb-localize key="contentLockCall_calling">Calling…</umb-localize>
                                    </span>
                                </div>
                            </div>
                            <div id="panel-controls">
                                <uui-button
                                    look="primary"
                                    color="danger"
                                    label="${this.localize.term('contentLockCall_hangUp')}"
                                    @click=${() => this.#webrtcCtx?.hangUp()}>
                                    <uui-icon name="icon-wrong"></uui-icon>
                                    <umb-localize key="contentLockCall_hangUp">Cancel</umb-localize>
                                </uui-button>
                            </div>
                        </div>
                    </umb-popover-layout>
                </uui-popover-container>
            `;
        }

        // connected to a call
        return html`
            <uui-button
                compact
                look="primary"
                popovertarget="contentlock-call-popover"
                label="${this.localize.term('contentLockCall_callButton')}">
                <uui-icon name="icon-phone"></uui-icon>
                <span class="timer">${this._callDuration}</span>
            </uui-button>
            <uui-popover-container id="contentlock-call-popover" placement="bottom-end" margin="6">
                <umb-popover-layout>
                    <div id="panel-content">
                        <div id="panel-header">
                            <umb-user-avatar
                                name="${this._remotePeer?.name ?? ''}"
                                .imgUrls=${this._remotePeer?.avatarUrls ?? []}>
                            </umb-user-avatar>
                            <div id="peer-info">
                                <strong>${this._remotePeer?.name}</strong>
                                <span class="timer">${this._callDuration}</span>
                            </div>
                        </div>

                        <div id="panel-controls">
                            <uui-button
                                look="outline"
                                color="${this._isMuted ? 'danger' : 'default'}"
                                label="${this._isMuted
                                    ? this.localize.term('contentLockCall_unmute')
                                    : this.localize.term('contentLockCall_mute')}"
                                @click=${() => this.#webrtcCtx?.toggleMute()}>
                                <uui-icon name="${this._isMuted ? 'icon-sound-off' : 'icon-audio-lines'}"></uui-icon>
                                ${this._isMuted
                                    ? html`<umb-localize key="contentLockCall_unmute">Unmute</umb-localize>`
                                    : html`<umb-localize key="contentLockCall_mute">Mute</umb-localize>`}
                            </uui-button>

                            <uui-button
                                look="primary"
                                color="danger"
                                label="${this.localize.term('contentLockCall_hangUp')}"
                                @click=${() => this.#webrtcCtx?.hangUp()}>
                                <uui-icon name="icon-wrong"></uui-icon>
                                <umb-localize key="contentLockCall_hangUp">Hang Up</umb-localize>
                            </uui-button>
                        </div>

                        ${this.#renderDeviceSettings()}
                    </div>
                </umb-popover-layout>
            </uui-popover-container>
        `;
    }

    #renderDeviceSettings() {
        return html`
            <div id="device-settings">
                <label for="mic-select">
                    <uui-icon name="icon-audio-lines"></uui-icon>
                    <umb-localize key="contentLockCall_microphone">Microphone</umb-localize>
                </label>
                <select
                    id="mic-select"
                    .value=${this._selectedMicId}
                    @change=${(e: Event) => {
                        this._selectedMicId = (e.target as HTMLSelectElement).value;
                        this.#handleDeviceChange();
                    }}>
                    ${this._micDevices.map((d) => html`
                        <option value="${d.deviceId}">${d.label || `Microphone ${d.deviceId.slice(0, 6)}`}</option>
                    `)}
                </select>

                <label for="speaker-select">
                    <uui-icon name="icon-speaker"></uui-icon>
                    <umb-localize key="contentLockCall_speaker">Speaker</umb-localize>
                </label>
                <select
                    id="speaker-select"
                    .value=${this._selectedSpeakerId}
                    @change=${(e: Event) => {
                        this._selectedSpeakerId = (e.target as HTMLSelectElement).value;
                        this.#handleDeviceChange();
                    }}>
                    ${this._speakerDevices.length > 0
                        ? this._speakerDevices.map((d) => html`
                            <option value="${d.deviceId}">${d.label || `Speaker ${d.deviceId.slice(0, 6)}`}</option>
                          `)
                        : html`<option value="">Default</option>`
                    }
                </select>
            </div>
        `;
    }

    static override styles = [
        ...UmbHeaderAppButtonElement.styles,
        css`
            .timer {
                font-size: var(--uui-type-small-size);
                font-variant-numeric: tabular-nums;
                margin-left: var(--uui-size-1);
            }

            .calling-label {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            /* Pulsing animation shown while the call is ringing */
            .calling-icon {
                animation: phone-pulse 1.2s ease-in-out infinite;
            }

            @keyframes phone-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            /* ── Popover content ── */
            #panel-content {
                padding: var(--uui-size-4);
                min-width: 240px;
            }

            /* UmbHeaderAppButtonElement's stylesheet rule sets font-size: 18px and
               --uui-button-background-color: transparent directly on every uui-button
               in this shadow root. Setting variables on the parent div has no effect
               because a direct element rule wins over inherited parent values.
               Using a higher-specificity selector (#id + element > element alone)
               lets us restore the UUI button defaults for controls inside the popover. */
            #panel-content uui-button {
                font-size: var(--uui-type-default-size);
                --uui-button-background-color: initial;
                --uui-button-background-color-hover: initial;
            }

            #panel-header {
                display: flex;
                align-items: center;
                gap: var(--uui-size-3);
                margin-bottom: var(--uui-size-3);
            }

            #peer-info {
                display: flex;
                flex-direction: column;
            }

            #peer-info strong {
                font-size: var(--uui-type-default-size);
            }

            #peer-info .timer {
                color: var(--uui-color-text-alt);
                margin-left: 0;
            }

            #panel-controls {
                display: flex;
                gap: var(--uui-size-2);
                margin-bottom: var(--uui-size-3);
            }

            #panel-controls uui-button:not([compact]) {
                flex: 1;
            }

            /* ── Device settings (always visible) ── */
            #device-settings {
                border-top: 1px solid var(--uui-color-border);
                padding-top: var(--uui-size-3);
                display: grid;
                grid-template-columns: auto 1fr;
                align-items: center;
                gap: var(--uui-size-2);
            }

            #device-settings label {
                display: flex;
                align-items: center;
                gap: var(--uui-size-1);
                font-size: var(--uui-type-small-size);
                white-space: nowrap;
            }

            #device-settings select {
                font-size: var(--uui-type-small-size);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                background: var(--uui-color-surface);
                color: var(--uui-color-text);
                padding: 2px 4px;
                width: 100%;
                min-width: 0;
            }
        `
    ];
}

export default ContentLockActiveCallHeaderApp;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-active-call-headerapp': ContentLockActiveCallHeaderApp;
    }
}
