import { css, customElement, html, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { CONTENTLOCK_WEBRTC_CONTEXT } from "../globalContexts/contentlock.webrtc.context";
import type { ScreenShareModalData, ScreenShareModalValue } from "./screenshare.modal.token";

interface StrokeSegment {
    x: number;
    y: number;
    ts: number;
    type: 'start' | 'move' | 'end';
}

const STROKE_FADE_MS = 3000;
const STROKE_COLOR = '#e53935';
const STROKE_WIDTH = 4;

/**
 * Full-screen modal shown to the viewer during a screen share.
 * Contains a <video> playing the remote screen stream and a transparent
 * <canvas> overlay for drawing ephemeral red-pen annotations.
 *
 * Draw mode is off by default; the viewer toggles it with the Draw button.
 * Annotation strokes are normalized (0–1) and sent to the sharer via the
 * WebRTC DataChannel managed by ContentLockWebRTCContext.
 */
@customElement('contentlock-screenshare-modal')
export class ContentLockScreenShareModal extends UmbModalBaseElement<ScreenShareModalData, ScreenShareModalValue> {

    @state() private _drawEnabled = false;
    @state() private _hasStream = false;
    @state() private _sharerName = '';

    @query('#remote-video')
    private _videoEl?: HTMLVideoElement;

    @query('#annotation-canvas')
    private _canvasEl?: HTMLCanvasElement;

    #webrtcCtx?: typeof CONTENTLOCK_WEBRTC_CONTEXT.TYPE;
    #isDrawing = false;
    #strokes: StrokeSegment[] = [];
    #rafId?: number;
    #strokeId = 0;

    constructor() {
        super();

        this.consumeContext(CONTENTLOCK_WEBRTC_CONTEXT, (ctx) => {
            if (!ctx) return;
            this.#webrtcCtx = ctx;

            // Watch the remote screen stream
            this.observe(ctx.remoteScreenStream, (stream) => {
                this._hasStream = !!stream;
                if (stream && this._videoEl) {
                    this._videoEl.srcObject = stream;
                } else if (!stream && this._videoEl) {
                    this._videoEl.srcObject = null;
                }
            });

            // Watch sharer name
            this.observe(ctx.remotePeer, (peer) => {
                this._sharerName = peer?.name ?? '';
            });

            // If screen share ends while modal is open, close it
            this.observe(ctx.screenShareState, (shareState) => {
                if (shareState === 'idle') {
                    this.modalContext?.reject();
                }
            });
        });
    }

    override connectedCallback() {
        super.connectedCallback();
        this.#startRenderLoop();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopRenderLoop();
    }

    // ── Annotation Rendering Loop ─────────────────────────────────────────

    #startRenderLoop() {
        const loop = () => {
            this.#renderStrokes();
            this.#rafId = requestAnimationFrame(loop);
        };
        this.#rafId = requestAnimationFrame(loop);
    }

    #stopRenderLoop() {
        if (this.#rafId !== undefined) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = undefined;
        }
    }

    #renderStrokes() {
        const canvas = this._canvasEl;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const now = Date.now();

        // Prune strokes older than fade duration
        this.#strokes = this.#strokes.filter(s => now - s.ts < STROKE_FADE_MS);

        // Clear and redraw all remaining segments
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = STROKE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = STROKE_COLOR;

        let pathOpen = false;

        for (let i = 0; i < this.#strokes.length; i++) {
            const seg = this.#strokes[i];
            const age = now - seg.ts;
            const alpha = Math.max(0, 1 - age / STROKE_FADE_MS);

            ctx.globalAlpha = alpha;

            if (seg.type === 'start') {
                if (pathOpen) ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(seg.x * canvas.width, seg.y * canvas.height);
                pathOpen = true;
            } else if (seg.type === 'move' && pathOpen) {
                ctx.lineTo(seg.x * canvas.width, seg.y * canvas.height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(seg.x * canvas.width, seg.y * canvas.height);
            } else if (seg.type === 'end' && pathOpen) {
                ctx.stroke();
                pathOpen = false;
            }
        }

        if (pathOpen) ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // ── Canvas Pointer Events ─────────────────────────────────────────────

    #handlePointerDown(e: PointerEvent) {
        if (!this._drawEnabled) return;
        this.#isDrawing = true;
        this.#strokeId++;
        const { x, y } = this.#normalizePointer(e);
        this.#addStroke('start', x, y);
        this.#webrtcCtx?.sendAnnotationStroke({ t: 'start', x, y });
    }

    #handlePointerMove(e: PointerEvent) {
        if (!this._drawEnabled || !this.#isDrawing) return;
        const { x, y } = this.#normalizePointer(e);
        this.#addStroke('move', x, y);
        this.#webrtcCtx?.sendAnnotationStroke({ t: 'move', x, y });
    }

    #handlePointerUp(e: PointerEvent) {
        if (!this._drawEnabled || !this.#isDrawing) return;
        this.#isDrawing = false;
        const { x, y } = this.#normalizePointer(e);
        this.#addStroke('end', x, y);
        this.#webrtcCtx?.sendAnnotationStroke({ t: 'end', x, y });
    }

    #normalizePointer(e: PointerEvent): { x: number; y: number } {
        const canvas = this._canvasEl!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    }

    #addStroke(type: 'start' | 'move' | 'end', x: number, y: number) {
        this.#strokes.push({ x, y, ts: Date.now(), type });
    }

    // ── Video Sizing ──────────────────────────────────────────────────────

    #syncCanvasSize() {
        const canvas = this._canvasEl;
        const video = this._videoEl;
        if (!canvas || !video) return;
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
    }

    // ── Render ────────────────────────────────────────────────────────────

    override render() {
        return html`
            <umb-body-layout headline="${this._sharerName ? `${this._sharerName}'s screen` : 'Screen Share'}">
                <div id="video-container" @resize=${this.#syncCanvasSize}>
                    <video
                        id="remote-video"
                        autoplay
                        playsinline
                        @loadedmetadata=${this.#syncCanvasSize}>
                    </video>
                    <canvas
                        id="annotation-canvas"
                        class=${this._drawEnabled ? 'draw-active' : ''}
                        @pointerdown=${this.#handlePointerDown}
                        @pointermove=${this.#handlePointerMove}
                        @pointerup=${this.#handlePointerUp}
                        @pointerleave=${this.#handlePointerUp}>
                    </canvas>
                    ${!this._hasStream ? html`
                        <div id="loading-overlay">
                            <uui-loader></uui-loader>
                            <p>Waiting for screen share…</p>
                        </div>
                    ` : ''}
                </div>

                <div slot="actions">
                    <uui-button
                        id="draw-toggle"
                        look="${this._drawEnabled ? 'primary' : 'outline'}"
                        color="${this._drawEnabled ? 'danger' : 'default'}"
                        label="${this._drawEnabled
                            ? this.localize.term('contentLockCall_stopDraw')
                            : this.localize.term('contentLockCall_draw')}"
                        @click=${() => { this._drawEnabled = !this._drawEnabled; this.#isDrawing = false; }}>
                        <uui-icon name="icon-edit"></uui-icon>
                        ${this._drawEnabled
                            ? html`<umb-localize key="contentLockCall_stopDraw">Stop Drawing</umb-localize>`
                            : html`<umb-localize key="contentLockCall_draw">Draw</umb-localize>`}
                    </uui-button>
                    <uui-button
                        look="outline"
                        label="Close"
                        @click=${() => this.modalContext?.reject()}>
                        <umb-localize key="general_close">Close</umb-localize>
                    </uui-button>
                </div>
            </umb-body-layout>
        `;
    }

    static override styles = css`
        :host {
            display: flex;
            flex-direction: column;
            width: 100vw;
            height: 100vh;
            background: var(--uui-color-surface);
        }

        umb-body-layout {
            height: 100%;
        }

        #video-container {
            position: relative;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        #remote-video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            pointer-events: none;
        }

        #annotation-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            cursor: default;
        }

        #annotation-canvas.draw-active {
            pointer-events: all;
            cursor: crosshair;
        }

        #loading-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--uui-size-4);
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
        }

        #loading-overlay p {
            margin: 0;
            font-size: var(--uui-type-default-size);
        }
    `;
}

export default ContentLockScreenShareModal;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-screenshare-modal': ContentLockScreenShareModal;
    }
}
