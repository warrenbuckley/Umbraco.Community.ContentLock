import { css, customElement, html, property, state, query } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type ContentLockWebRTCContext from "./contentlock.webrtc.context";

const BAR_COUNT = 7;
const BAR_MIN_HEIGHT = 3;  // px — minimum bar height when silent
const BAR_MAX_HEIGHT = 24; // px — maximum bar height at full volume

/**
 * Draggable floating widget displayed during an active WebRTC audio call.
 *
 * Receives the WebRTC context directly as a property (not via consumeContext)
 * because this element is appended to document.body outside the Umbraco app shell.
 *
 * Features:
 * - Draggable via pointer events
 * - Remote user avatar + name
 * - Live call duration timer
 * - Real-time microphone waveform (Web Audio API AnalyserNode → 7 SVG bars)
 * - Mute toggle button
 * - Hang-up button
 * - Settings cog expanding a mic + speaker device picker
 */
@customElement('contentlock-active-call-widget')
export class ContentLockActiveCallWidgetElement extends UmbLitElement {

    @property({ attribute: false })
    webrtcContext?: ContentLockWebRTCContext;

    // ── Observable state observed from the context ─────────────────────
    @state() private _remotePeerName = '';
    @state() private _remotePeerAvatarUrls: string[] = [];
    @state() private _isMuted = false;
    @state() private _callDuration = '0:00';
    @state() private _showDeviceSettings = false;

    // ── Device lists ───────────────────────────────────────────────────
    @state() private _micDevices: MediaDeviceInfo[] = [];
    @state() private _speakerDevices: MediaDeviceInfo[] = [];
    @state() private _selectedMicId = '';
    @state() private _selectedSpeakerId = '';

    // ── Web Audio API waveform ─────────────────────────────────────────
    @state() private _waveformBars: number[] = new Array(BAR_COUNT).fill(BAR_MIN_HEIGHT);

    #analyser?: AnalyserNode;
    #audioCtx?: AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #freqData?: Uint8Array<any>;
    #rafId?: number;

    // ── Drag state ─────────────────────────────────────────────────────
    #isDragging = false;
    #dragOffsetX = 0;
    #dragOffsetY = 0;
    #posX = 0;
    #posY = 0;

    // ── Timer ──────────────────────────────────────────────────────────
    #timerInterval?: ReturnType<typeof setInterval>;

    // ── DOM ref for the drag handle ────────────────────────────────────
    @query('#widget') private _widgetEl?: HTMLElement;

    override connectedCallback() {
        super.connectedCallback();
        this.#startObservingContext();
        this.#startTimer();
        this.#loadAudioDevices();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopWaveform();
        clearInterval(this.#timerInterval);
    }

    // ── Context Observation ────────────────────────────────────────────

    #startObservingContext() {
        if (!this.webrtcContext) return;

        this.observe(this.webrtcContext.remotePeer, (peer) => {
            this._remotePeerName = peer?.name ?? '';
            this._remotePeerAvatarUrls = peer?.avatarUrls ?? [];
        });

        this.observe(this.webrtcContext.isMuted, (muted) => {
            this._isMuted = muted;
        });

        // Start waveform after the context has a local stream
        this.#startWaveform();
    }

    // ── Web Audio API Waveform ─────────────────────────────────────────

    #startWaveform() {
        const stream = this.webrtcContext?.getLocalStream();
        if (!stream) return;

        try {
            this.#audioCtx = new AudioContext();
            this.#analyser = this.#audioCtx.createAnalyser();
            this.#analyser.fftSize = 64;           // → 32 frequency bins
            this.#analyser.smoothingTimeConstant = 0.8; // smooth bar transitions

            const source = this.#audioCtx.createMediaStreamSource(stream);
            source.connect(this.#analyser);

            this.#freqData = new Uint8Array(this.#analyser.frequencyBinCount);
            this.#animateWaveform();
        } catch {
            // Web Audio API not available — waveform simply won't render
        }
    }

    #animateWaveform() {
        if (!this.#analyser || !this.#freqData) return;

        this.#analyser.getByteFrequencyData(this.#freqData);

        // Map 32 frequency bins to BAR_COUNT bars using the voice range (bins 0–15)
        const binCount = this.#freqData.length;
        const step = Math.floor((binCount / 2) / BAR_COUNT); // focus on lower half (voice freqs)

        this._waveformBars = Array.from({ length: BAR_COUNT }, (_, i) => {
            const value = this.#freqData![i * step] ?? 0;            // 0–255
            const ratio = value / 255;
            return BAR_MIN_HEIGHT + ratio * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
        });

        this.#rafId = requestAnimationFrame(() => this.#animateWaveform());
    }

    #stopWaveform() {
        if (this.#rafId !== undefined) {
            cancelAnimationFrame(this.#rafId);
        }
        this.#audioCtx?.close();
        this.#audioCtx = undefined;
        this.#analyser = undefined;
    }

    // ── Call Timer ─────────────────────────────────────────────────────

    #startTimer() {
        this.#timerInterval = setInterval(() => {
            const start = this.webrtcContext?.getCallStartTime();
            if (!start) return;

            const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this._callDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
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
        this.dispatchEvent(new CustomEvent('call-devices-changed', {
            detail: {
                micId: this._selectedMicId,
                speakerId: this._selectedSpeakerId,
            },
            bubbles: false,
        }));
    }

    // ── Drag Behaviour ─────────────────────────────────────────────────

    #handlePointerDown(e: PointerEvent) {
        // Only drag on the header area (not buttons inside it)
        if ((e.target as HTMLElement).closest('uui-button')) return;

        this.#isDragging = true;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this.#dragOffsetX = e.clientX - rect.left - this.#posX;
        this.#dragOffsetY = e.clientY - rect.top - this.#posY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    #handlePointerMove(e: PointerEvent) {
        if (!this.#isDragging) return;
        this.#posX = e.clientX - this.#dragOffsetX;
        this.#posY = e.clientY - this.#dragOffsetY;
        this.#applyPosition();
    }

    #handlePointerUp(e: PointerEvent) {
        this.#isDragging = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }

    #applyPosition() {
        if (this._widgetEl) {
            this._widgetEl.style.transform = `translate(${this.#posX}px, ${this.#posY}px)`;
        }
    }

    // ── Action Handlers ────────────────────────────────────────────────

    #handleHangUp() {
        this.dispatchEvent(new CustomEvent('call-hangup', { bubbles: false }));
    }

    #handleMuteToggle() {
        this.dispatchEvent(new CustomEvent('call-mute-toggle', { bubbles: false }));
    }

    #toggleDeviceSettings() {
        this._showDeviceSettings = !this._showDeviceSettings;
        if (this._showDeviceSettings) {
            this.#loadAudioDevices();
        }
    }

    // ── Rendering ──────────────────────────────────────────────────────

    override render() {
        return html`
            <div
                id="widget"
                @pointerdown=${this.#handlePointerDown}
                @pointermove=${this.#handlePointerMove}
                @pointerup=${this.#handlePointerUp}>

                <div id="header">
                    <umb-user-avatar
                        name="${this._remotePeerName}"
                        .imgUrls=${this._remotePeerAvatarUrls}>
                    </umb-user-avatar>
                    <div id="peer-info">
                        <strong id="peer-name">${this._remotePeerName}</strong>
                        <span id="timer">${this._callDuration}</span>
                    </div>
                </div>

                ${this.#renderWaveform()}

                <div id="controls">
                    <uui-button
                        compact
                        look="outline"
                        color="${this._isMuted ? 'danger' : 'default'}"
                        label="${this._isMuted
                            ? this.localize.term('contentLockCall_unmute')
                            : this.localize.term('contentLockCall_mute')}"
                        title="${this._isMuted
                            ? this.localize.term('contentLockCall_unmute')
                            : this.localize.term('contentLockCall_mute')}"
                        @click=${this.#handleMuteToggle}>
                        <uui-icon name="${this._isMuted ? 'icon-microphone-off' : 'icon-microphone'}"></uui-icon>
                    </uui-button>

                    <uui-button
                        compact
                        look="primary"
                        color="danger"
                        label="${this.localize.term('contentLockCall_hangUp')}"
                        title="${this.localize.term('contentLockCall_hangUp')}"
                        @click=${this.#handleHangUp}>
                        <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>

                    <uui-button
                        compact
                        look="outline"
                        label="${this.localize.term('contentLockCall_deviceSettings')}"
                        title="${this.localize.term('contentLockCall_deviceSettings')}"
                        @click=${this.#toggleDeviceSettings}>
                        <uui-icon name="icon-settings"></uui-icon>
                    </uui-button>
                </div>

                ${this._showDeviceSettings ? this.#renderDeviceSettings() : ''}
            </div>
        `;
    }

    #renderWaveform() {
        const svgWidth = BAR_COUNT * 14; // 7 bars × 14px (bar + gap)
        return html`
            <div id="waveform" aria-hidden="true">
                <svg
                    width="${svgWidth}"
                    height="${BAR_MAX_HEIGHT}"
                    viewBox="0 0 ${svgWidth} ${BAR_MAX_HEIGHT}">
                    ${this._waveformBars.map((barHeight, i) => html`
                        <rect
                            x="${i * 14 + 3}"
                            y="${(BAR_MAX_HEIGHT - barHeight) / 2}"
                            width="8"
                            height="${barHeight}"
                            rx="4"
                            fill="var(--uui-color-interactive)">
                        </rect>
                    `)}
                </svg>
            </div>
        `;
    }

    #renderDeviceSettings() {
        return html`
            <div id="device-settings">
                <label for="mic-select">
                    <uui-icon name="icon-microphone"></uui-icon>
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

    static styles = css`
        :host {
            /* Widget is appended directly to document.body as a portal */
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 1000;
            user-select: none;
        }

        #widget {
            background: var(--uui-color-surface);
            border: 1px solid var(--uui-color-border);
            border-radius: var(--uui-border-radius);
            box-shadow: var(--uui-shadow-depth-3, 0 4px 16px rgba(0,0,0,0.18));
            padding: var(--uui-size-4);
            width: 200px;
            cursor: grab;
        }

        #widget:active {
            cursor: grabbing;
        }

        #header {
            display: flex;
            align-items: center;
            gap: var(--uui-size-3);
            margin-bottom: var(--uui-size-3);
            pointer-events: none; /* header area is drag-only, no click targets */
        }

        #peer-info {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        #peer-name {
            font-size: var(--uui-type-default-size);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #timer {
            font-size: var(--uui-type-small-size);
            color: var(--uui-color-text-alt);
            font-variant-numeric: tabular-nums;
        }

        #waveform {
            display: flex;
            justify-content: center;
            margin-bottom: var(--uui-size-3);
        }

        #waveform svg rect {
            transition: height 0.05s ease, y 0.05s ease;
        }

        #controls {
            display: flex;
            gap: var(--uui-size-2);
            justify-content: center;
            /* Buttons must be clickable, not draggable */
            pointer-events: all;
            cursor: default;
        }

        #controls uui-button {
            flex: 1;
        }

        #device-settings {
            margin-top: var(--uui-size-3);
            border-top: 1px solid var(--uui-color-border);
            padding-top: var(--uui-size-3);
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: var(--uui-size-2);
            pointer-events: all;
            cursor: default;
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
    `;
}

export default ContentLockActiveCallWidgetElement;
