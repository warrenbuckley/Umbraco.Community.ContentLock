import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import type { WebRTCOptions } from "../interfaces/ContentLockOptions";
import { ContentLockService } from "../api/sdk.gen";

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';
export type ScreenShareState = 'idle' | 'sharing' | 'viewing';

export interface RemotePeerInfo {
    key: string;
    name: string;
    avatarUrls: string[];
}

interface PendingCallInfo {
    callerKey: string;
    callerName: string;
    sdpOffer: string;
}

interface AnnotationSegment {
    x: number;
    y: number;
    ts: number;
    type: 'start' | 'move' | 'end';
}

export interface AnnotationStroke {
    t: 'start' | 'move' | 'end';
    x: number;
    y: number;
}

export default class ContentLockWebRTCContext extends UmbContextBase {

    // ── Observable State ──────────────────────────────────────────────────

    #callState = new UmbObjectState<CallState>('idle');
    #remotePeer = new UmbObjectState<RemotePeerInfo | undefined>(undefined);
    #isMuted = new UmbObjectState<boolean>(false);
    #screenShareState = new UmbObjectState<ScreenShareState>('idle');
    #remoteScreenStream = new UmbObjectState<MediaStream | null>(null);

    public callState = this.#callState.asObservable();
    public remotePeer = this.#remotePeer.asObservable();
    public isMuted = this.#isMuted.asObservable();
    public screenShareState = this.#screenShareState.asObservable();
    public isScreenSharing = this.#screenShareState.asObservablePart(s => s === 'sharing');
    public isViewingScreenShare = this.#screenShareState.asObservablePart(s => s === 'viewing');
    public remoteScreenStream = this.#remoteScreenStream.asObservable();

    // ── Private State ─────────────────────────────────────────────────────

    #userItemRepository = new UmbUserItemRepository(this);

    #peerConnection?: RTCPeerConnection;
    #localStream?: MediaStream;
    #remoteAudioEl?: HTMLAudioElement;
    #ringbackAudio?: HTMLAudioElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #incomingCallNotificationHandler?: any;
    #pendingCallInfo?: PendingCallInfo;
    #pendingIceCandidates: RTCIceCandidateInit[] = [];
    #callStartTime?: Date;
    #ringSound: string = '/App_Plugins/ContentLock/sounds/ringtone.mp3';
    #ringbackSound: string = '/App_Plugins/ContentLock/sounds/ringtone.mp3';
    #iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
    ];

    // ── Screen Share Private State ────────────────────────────────────────
    #screenShareSender?: RTCRtpSender;
    #screenShareStream?: MediaStream;
    #annotationChannel?: RTCDataChannel;
    #annotationCanvas?: HTMLCanvasElement;
    #annotationRafId?: number;
    #annotationStrokes: AnnotationSegment[] = [];
    #resizeHandler?: () => void;

    #signalrCtx?: typeof CONTENTLOCK_SIGNALR_CONTEXT.TYPE;
    #notificationCtx?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;

    constructor(host: UmbControllerHost) {
        super(host, CONTENTLOCK_WEBRTC_CONTEXT);

        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
            this.#notificationCtx = ctx;
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            if (!signalrCtx) return;

            this.#signalrCtx = signalrCtx;

            // Keep ICE servers and sounds in sync with reactive options
            this.observe(signalrCtx.contentLockOptions, (options) => {
                if (options?.webRTC) {
                    this.#updateIceServers(options.webRTC);
                    if (options.webRTC.sounds?.ringSound) {
                        this.#ringSound = options.webRTC.sounds.ringSound;
                    }
                    if (options.webRTC.sounds?.ringbackSound) {
                        this.#ringbackSound = options.webRTC.sounds.ringbackSound;
                    }
                }
            });

            // Register WebRTC signaling handlers via the SignalR context.
            // addSignalRHandler() queues them internally if the connection is not yet
            // ready and flushes them once it is — no polling required.
            this.#registerSignalRHandlers(signalrCtx);
        });
    }

    // ── Public Methods ────────────────────────────────────────────────────

    /**
     * Initiate an outbound audio call to another backoffice user.
     * @param targetUserKey  GUID of the user to call
     * @param targetUserName Display name (shown in the call widget)
     * @param targetAvatarUrls Avatar image URLs (may be empty, initials used as fallback)
     */
    async initiateCall(targetUserKey: string, targetUserName: string, targetAvatarUrls: string[]) {
        if (this.#callState.getValue() !== 'idle') return;

        this.#remotePeer.setValue({ key: targetUserKey, name: targetUserName, avatarUrls: targetAvatarUrls });
        this.#callState.setValue('calling');

        try {
            const [localStream, iceServers] = await Promise.all([
                navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
                this.#fetchFreshIceServers(),
            ]);
            this.#localStream = localStream;
            this.#peerConnection = this.#createPeerConnection(targetUserKey, iceServers);

            for (const track of this.#localStream.getAudioTracks()) {
                this.#peerConnection.addTrack(track, this.#localStream);
            }

            // Create the annotation DataChannel as part of the initial offer
            // so it is included in the SDP and ready to use if screen sharing starts.
            const channel = this.#peerConnection.createDataChannel('annotations');
            this.#setupAnnotationChannel(channel);

            const offer = await this.#peerConnection.createOffer();
            await this.#peerConnection.setLocalDescription(offer);

            await this.#signalrCtx?.signalrConnection?.invoke('SendCallOfferAsync', targetUserKey, offer.sdp);
            this.#startRingback();
        } catch (err) {
            console.error('[ContentLock WebRTC] Failed to initiate call:', err);
            this.#cleanUpCall();
            this.#showPeekNotification('danger', this.#getMediaErrorMessage(err));
        }
    }

    /**
     * Accept an incoming call offer. Creates a peer connection, generates the SDP answer,
     * and transitions the call to 'connected'.
     */
    async acceptCall() {
        if (!this.#pendingCallInfo) return;

        const { callerKey, callerName, sdpOffer } = this.#pendingCallInfo;

        // Dismiss the incoming call notification
        this.#incomingCallNotificationHandler?.close();
        this.#incomingCallNotificationHandler = undefined;

        // Set remote peer info immediately so the UI can render initials as a fallback,
        // then patch avatarUrls once the repository resolves them.
        this.#remotePeer.setValue({ key: callerKey, name: callerName, avatarUrls: [] });
        this.#userItemRepository.requestItems([callerKey]).then((result) => {
            const urls = result.data?.[0]?.avatarUrls ?? [];
            if (urls.length) {
                this.#remotePeer.setValue({ key: callerKey, name: callerName, avatarUrls: urls });
            }
        });

        try {
            const [localStream, iceServers] = await Promise.all([
                navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
                this.#fetchFreshIceServers(),
            ]);
            this.#localStream = localStream;
            this.#peerConnection = this.#createPeerConnection(callerKey, iceServers);

            for (const track of this.#localStream.getAudioTracks()) {
                this.#peerConnection.addTrack(track, this.#localStream);
            }

            await this.#peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'offer', sdp: sdpOffer })
            );

            // Flush any ICE candidates that arrived before setRemoteDescription
            await this.#flushPendingIceCandidates();

            const answer = await this.#peerConnection.createAnswer();
            await this.#peerConnection.setLocalDescription(answer);

            await this.#signalrCtx?.signalrConnection?.invoke('SendCallAnswerAsync', callerKey, answer.sdp);

            this.#callState.setValue('connected');
            this.#callStartTime = new Date();
        } catch (err) {
            console.error('[ContentLock WebRTC] Failed to accept call:', err);
            // Notify the caller so they are not left stuck in the 'calling' state.
            // SendCallAnswerAsync was never invoked, so ActiveCalls was never registered
            // on the server — only the caller's JS context needs to be unblocked.
            await this.#signalrCtx?.signalrConnection?.invoke('DeclineCallAsync', callerKey);
            this.#cleanUpCall();
            this.#showPeekNotification('danger', this.#getMediaErrorMessage(err));
        }
    }

    /** Decline an incoming call and notify the caller. */
    async declineCall() {
        if (!this.#pendingCallInfo) return;

        await this.#signalrCtx?.signalrConnection?.invoke('DeclineCallAsync', this.#pendingCallInfo.callerKey);

        this.#incomingCallNotificationHandler?.close();
        this.#incomingCallNotificationHandler = undefined;
        this.#pendingCallInfo = undefined;
        this.#callState.setValue('idle');
    }

    /** End the active call and notify the other party. */
    async hangUp() {
        const peerKey = this.#remotePeer.getValue()?.key;
        if (peerKey) {
            await this.#signalrCtx?.signalrConnection?.invoke('EndCallAsync', peerKey);
        }
        this.#cleanUpCall();
    }

    /** Toggle the local microphone mute state. */
    toggleMute() {
        if (!this.#localStream) return;

        const currentlyMuted = this.#isMuted.getValue();
        for (const track of this.#localStream.getAudioTracks()) {
            track.enabled = currentlyMuted; // if muted → enable; if live → disable
        }
        this.#isMuted.setValue(!currentlyMuted);
    }

    /**
     * Switch the active microphone and/or speaker device mid-call.
     * @param micId     deviceId for the microphone (from enumerateDevices)
     * @param speakerId deviceId for the speaker output (from enumerateDevices)
     */
    async setAudioDevices(micId: string, speakerId: string) {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: micId ? { deviceId: { exact: micId } } : true,
                video: false,
            });

            if (this.#peerConnection && this.#localStream) {
                const newTrack = newStream.getAudioTracks()[0];
                const audioSender = this.#peerConnection
                    .getSenders()
                    .find((s) => s.track?.kind === 'audio');
                if (audioSender) {
                    await audioSender.replaceTrack(newTrack);
                }

                // Stop old tracks, replace stream reference
                this.#localStream.getAudioTracks().forEach((t) => t.stop());
                this.#localStream = newStream;

                // Preserve mute state on the new track
                if (this.#isMuted.getValue()) {
                    newTrack.enabled = false;
                }
            } else {
                // No active call — stop the acquired stream immediately so the
                // microphone is not left open with no reference left to close it.
                newStream.getAudioTracks().forEach((t) => t.stop());
                return;
            }

            // Change speaker output device if the browser supports setSinkId
            if (speakerId && this.#remoteAudioEl && 'setSinkId' in this.#remoteAudioEl) {
                await (this.#remoteAudioEl as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
                    .setSinkId(speakerId);
            }
        } catch (err) {
            console.error('[ContentLock WebRTC] Failed to switch audio devices:', err);
        }
    }

    /** Returns the call start time (undefined when not in a call). */
    getCallStartTime(): Date | undefined {
        return this.#callStartTime;
    }

    /**
     * Returns the local MediaStream so the call widget can create an AnalyserNode
     * for the microphone waveform visualisation.
     */
    getLocalStream(): MediaStream | undefined {
        return this.#localStream;
    }

    // ── Private: SignalR Signaling Handlers ───────────────────────────────

    #registerSignalRHandlers(signalrCtx: typeof CONTENTLOCK_SIGNALR_CONTEXT.TYPE) {
        // Incoming call offer from another user
        signalrCtx.addSignalRHandler('ReceiveCallOffer', async (callerKey: string, callerName: string, sdpOffer: string) => {
            this.#pendingCallInfo = { callerKey, callerName, sdpOffer };
            this.#callState.setValue('incoming');
            this.#showIncomingCallNotification(callerKey, callerName);
        });

        // Callee accepted — SDP answer received by the caller
        signalrCtx.addSignalRHandler('ReceiveCallAnswer', async (sdpAnswer: string) => {
            if (!this.#peerConnection) return;

            this.#stopRingback();

            await this.#peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer })
            );
            await this.#flushPendingIceCandidates();

            this.#callState.setValue('connected');
            this.#callStartTime = new Date();
        });

        // ICE candidate from the remote peer
        signalrCtx.addSignalRHandler('ReceiveIceCandidate', async (candidate: string, sdpMid: string | null, sdpMLineIndex: number | null) => {
            const init: RTCIceCandidateInit = {
                candidate,
                sdpMid: sdpMid ?? undefined,
                sdpMLineIndex: sdpMLineIndex ?? undefined,
            };

            if (this.#peerConnection?.remoteDescription) {
                await this.#peerConnection.addIceCandidate(new RTCIceCandidate(init));
            } else {
                // Buffer until setRemoteDescription has been called
                this.#pendingIceCandidates.push(init);
            }
        });

        // Callee declined the call
        signalrCtx.addSignalRHandler('CallDeclined', () => {
            const peerName = this.#remotePeer.getValue()?.name ?? 'User';
            this.#cleanUpCall();
            this.#showPeekNotification('default', `${peerName} declined the call`);
        });

        // Other party ended or dropped the call
        signalrCtx.addSignalRHandler('CallEnded', () => {
            this.#cleanUpCall();
            this.#showPeekNotification('default', 'Call ended');
        });

        // Target user is already in another call
        signalrCtx.addSignalRHandler('CallBusy', () => {
            const peerName = this.#remotePeer.getValue()?.name ?? 'User';
            this.#cleanUpCall();
            this.#showPeekNotification('warning', `${peerName} is currently on another call`);
        });

        // Ring timeout expired — callee never answered (received by the caller)
        signalrCtx.addSignalRHandler('CallNoAnswer', () => {
            const peerName = this.#remotePeer.getValue()?.name ?? 'User';
            this.#cleanUpCall();
            this.#showPeekNotification('warning', `${peerName} didn't answer`);
        });

        // Ring timeout expired — this client was the callee who missed the call
        signalrCtx.addSignalRHandler('MissedCall', (_callerKey: string, callerName: string) => {
            this.#incomingCallNotificationHandler?.close();
            this.#incomingCallNotificationHandler = undefined;
            this.#pendingCallInfo = undefined;
            this.#callState.setValue('idle');
            this.#notificationCtx?.stay('warning', {
                data: {
                    headline: 'Missed call',
                    message: `${callerName} tried to call you`,
                },
            });
        });

        // ── Screen Share Signaling ────────────────────────────────────────

        // Sharer added video track — renegotiation offer received by the viewer
        signalrCtx.addSignalRHandler('ReceiveScreenShareOffer', async (sharerKey: string, _sharerName: string, sdpOffer: string) => {
            if (!this.#peerConnection) return;
            try {
                await this.#peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: 'offer', sdp: sdpOffer })
                );
                const answer = await this.#peerConnection.createAnswer();
                await this.#peerConnection.setLocalDescription(answer);
                await this.#signalrCtx?.signalrConnection?.invoke(
                    'SendScreenShareAnswerAsync',
                    sharerKey,
                    answer.sdp
                );
            } catch (err) {
                console.error('[ContentLock WebRTC] Failed to handle screen share renegotiation:', err);
            }
        });

        // Viewer's renegotiation answer received by the sharer
        signalrCtx.addSignalRHandler('ReceiveScreenShareAnswer', async (sdpAnswer: string) => {
            if (!this.#peerConnection) return;
            try {
                await this.#peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer })
                );
            } catch (err) {
                console.error('[ContentLock WebRTC] Failed to set screen share answer:', err);
            }
        });

        // Sharer notified us that sharing has started — show the viewer toast
        signalrCtx.addSignalRHandler('ScreenShareStarted', (sharerKey: string, sharerName: string) => {
            this.#screenShareState.setValue('viewing');
            this.#showScreenShareNotification(sharerKey, sharerName);
        });

        // Sharer stopped sharing — clean up viewer state
        signalrCtx.addSignalRHandler('ScreenShareEnded', () => {
            this.#remoteScreenStream.setValue(null);
            this.#screenShareState.setValue('idle');
        });
    }

    // ── Private: TURN Credentials ─────────────────────────────────────────

    /**
     * Fetches fresh ICE servers from the server-side TURN credential provider.
     * Falls back to the options-based ICE servers (STUN + any static TURN) on error
     * or when the provider returns an empty list (e.g. Provider = "None").
     */
    async #fetchFreshIceServers(): Promise<RTCIceServer[]> {
        try {
            const result = await ContentLockService.getTurnCredentials();

            if (result.data && result.data.length > 0) {
                const stunOnly = this.#iceServers.filter(s => !s.username);
                const turn: RTCIceServer[] = result.data.map(s => ({
                    urls: s.urls,
                    username: s.username ?? undefined,
                    credential: s.credential ?? undefined,
                }));
                return [...stunOnly, ...turn];
            }
        } catch {
            console.warn('[ContentLock WebRTC] TURN credential fetch failed, falling back to STUN-only');
        }
        return this.#iceServers;
    }

    // ── Private: WebRTC Peer Connection ───────────────────────────────────

    #createPeerConnection(peerUserKey: string, iceServers: RTCIceServer[]): RTCPeerConnection {
        const pc = new RTCPeerConnection({ iceServers });

        // Relay ICE candidates to the remote peer via SignalR as they are gathered
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.#signalrCtx?.signalrConnection?.invoke(
                    'SendIceCandidateAsync',
                    peerUserKey,
                    event.candidate.candidate,
                    event.candidate.sdpMid,
                    event.candidate.sdpMLineIndex
                );
            }
        };

        // Handle incoming tracks from the remote peer
        pc.ontrack = (event) => {
            if (event.track.kind === 'audio') {
                // Remote audio — attach to an <audio> element for playback
                if (!this.#remoteAudioEl) {
                    this.#remoteAudioEl = Object.assign(document.createElement('audio'), { autoplay: true });
                    document.body.appendChild(this.#remoteAudioEl);
                }
                this.#remoteAudioEl.srcObject = event.streams[0];
            } else if (event.track.kind === 'video') {
                // Remote screen share video track
                this.#remoteScreenStream.setValue(event.streams[0]);
            }
        };

        // Renegotiation handler — fires when a screen share video track is added/removed.
        // Only handle it after the initial call is fully connected so that initial
        // offer/answer setup is not intercepted here.
        pc.onnegotiationneeded = async () => {
            if (this.#callState.getValue() !== 'connected') return;
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await this.#signalrCtx?.signalrConnection?.invoke(
                    'SendScreenShareOfferAsync',
                    peerUserKey,
                    offer.sdp
                );
            } catch (err) {
                console.error('[ContentLock WebRTC] Renegotiation failed:', err);
            }
        };

        // Capture the annotation DataChannel when the callee side receives it
        pc.ondatachannel = (event) => {
            if (event.channel.label === 'annotations') {
                this.#setupAnnotationChannel(event.channel);
            }
        };

        return pc;
    }

    async #flushPendingIceCandidates() {
        if (!this.#peerConnection || this.#pendingIceCandidates.length === 0) return;

        // Snapshot and clear atomically before the async loop so that any
        // ReceiveIceCandidate events arriving during the awaits are handled
        // directly (remoteDescription is already set at this point) and cannot
        // be iterated a second time by this flush.
        const candidates = this.#pendingIceCandidates;
        this.#pendingIceCandidates = [];

        for (const init of candidates) {
            await this.#peerConnection.addIceCandidate(new RTCIceCandidate(init));
        }
    }

    // ── Private: Ringback Audio ───────────────────────────────────────────

    #startRingback() {
        try {
            this.#ringbackAudio = Object.assign(new Audio(this.#ringbackSound), { loop: true });
            this.#ringbackAudio.play().catch(() => {
                // Browser may block autoplay — safe to ignore, the UI still shows
            });
        } catch {
            // Audio not critical for the call to function
        }
    }

    #stopRingback() {
        if (this.#ringbackAudio) {
            this.#ringbackAudio.pause();
            this.#ringbackAudio.currentTime = 0;
            this.#ringbackAudio = undefined;
        }
    }

    // ── Private: UI ───────────────────────────────────────────────────────

    #showIncomingCallNotification(callerKey: string, callerName: string) {
        if (!this.#notificationCtx) return;

        this.#incomingCallNotificationHandler = this.#notificationCtx.stay("default", {
            elementName: 'contentlock-incoming-call-notification',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { callerKey, callerName, ringSound: this.#ringSound } as any,
        });
    }

    #showPeekNotification(color: 'default' | 'positive' | 'warning' | 'danger', message: string) {
        this.#notificationCtx?.peek(color, { data: { message } });
    }

    #getMediaErrorMessage(err: unknown): string {
        if (err instanceof DOMException) {
            switch (err.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    return 'Microphone access was denied. Please allow microphone access in your browser settings and try again.';
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    return 'No microphone was found. Please connect a microphone and try again.';
                case 'NotReadableError':
                case 'TrackStartError':
                    return 'Your microphone could not be accessed. It may be in use by another application.';
            }
        }
        return 'Failed to start call. Please check your microphone and try again.';
    }

    // ── Public: Screen Share ──────────────────────────────────────────────

    /**
     * Start sharing the current browser tab with the call peer.
     * Uses preferCurrentTab to skip the full OS screen picker on Chrome/Edge.
     */
    async startScreenShare() {
        if (this.#screenShareState.getValue() !== 'idle') return;
        if (!this.#peerConnection) return;

        try {
            // preferCurrentTab skips the full OS picker on Chrome 107+ and shows
            // a minimal "Share this tab?" prompt instead. Falls back gracefully on Firefox/Safari.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: { displaySurface: 'browser' },
                audio: false,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
            });

            const videoTrack = displayStream.getVideoTracks()[0];

            // Handle the user clicking "Stop Sharing" in the browser's built-in UI
            videoTrack.addEventListener('ended', () => this.stopScreenShare());

            // Adding a track triggers onnegotiationneeded which sends the renegotiation offer
            this.#screenShareSender = this.#peerConnection.addTrack(videoTrack, displayStream);
            this.#screenShareStream = displayStream;
            this.#screenShareState.setValue('sharing');

            // Inject the transparent annotation canvas over the sharer's Umbraco view
            this.#injectAnnotationCanvas();

            // Notify the peer to show the "View Screen" toast
            const peerKey = this.#remotePeer.getValue()?.key;
            if (peerKey) {
                await this.#signalrCtx?.signalrConnection?.invoke('SendScreenShareStartedAsync', peerKey);
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                // User cancelled the screen picker — not an error, call continues
                return;
            }
            console.error('[ContentLock WebRTC] Failed to start screen share:', err);
        }
    }

    /**
     * Stop screen sharing and notify the peer to close the viewer modal.
     */
    async stopScreenShare() {
        if (this.#screenShareState.getValue() === 'idle') return;

        const peerKey = this.#remotePeer.getValue()?.key;

        // Clean up local screen share resources
        this.#cleanUpScreenShare();

        // Notify the peer that sharing has ended
        if (peerKey) {
            await this.#signalrCtx?.signalrConnection?.invoke('SendScreenShareEndedAsync', peerKey);
        }
    }

    /**
     * Send an annotation stroke over the DataChannel to the sharer.
     * Called by the viewer's screen share modal canvas.
     */
    sendAnnotationStroke(stroke: AnnotationStroke) {
        if (this.#annotationChannel?.readyState === 'open') {
            this.#annotationChannel.send(JSON.stringify(stroke));
        }
    }

    // ── Private: Screen Share Helpers ─────────────────────────────────────

    #setupAnnotationChannel(channel: RTCDataChannel) {
        this.#annotationChannel = channel;
        channel.onmessage = (event) => {
            try {
                const stroke = JSON.parse(event.data) as AnnotationStroke;
                this.#annotationStrokes.push({
                    x: stroke.x,
                    y: stroke.y,
                    ts: Date.now(),
                    type: stroke.t,
                });
            } catch {
                // Invalid stroke data — ignore
            }
        };
    }

    #injectAnnotationCanvas() {
        if (this.#annotationCanvas) return;

        const canvas = document.createElement('canvas');
        canvas.id = 'contentlock-annotation-overlay';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:10000;background:transparent;';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        this.#annotationCanvas = canvas;

        this.#resizeHandler = () => {
            if (this.#annotationCanvas) {
                this.#annotationCanvas.width = window.innerWidth;
                this.#annotationCanvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', this.#resizeHandler);

        this.#startAnnotationRenderLoop();
    }

    #removeAnnotationCanvas() {
        if (this.#annotationCanvas) {
            document.body.removeChild(this.#annotationCanvas);
            this.#annotationCanvas = undefined;
        }
        if (this.#resizeHandler) {
            window.removeEventListener('resize', this.#resizeHandler);
            this.#resizeHandler = undefined;
        }
        this.#stopAnnotationRenderLoop();
        this.#annotationStrokes = [];
    }

    #startAnnotationRenderLoop() {
        const FADE_MS = 3000;
        const COLOR = '#e53935';
        const WIDTH = 4;

        const loop = () => {
            const canvas = this.#annotationCanvas;
            if (!canvas) return;
            const ctx2d = canvas.getContext('2d');
            if (!ctx2d) { this.#annotationRafId = requestAnimationFrame(loop); return; }

            const now = Date.now();
            this.#annotationStrokes = this.#annotationStrokes.filter(s => now - s.ts < FADE_MS);

            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.lineWidth = WIDTH;
            ctx2d.lineCap = 'round';
            ctx2d.lineJoin = 'round';
            ctx2d.strokeStyle = COLOR;

            let pathOpen = false;
            for (const seg of this.#annotationStrokes) {
                const alpha = Math.max(0, 1 - (now - seg.ts) / FADE_MS);
                ctx2d.globalAlpha = alpha;
                if (seg.type === 'start') {
                    if (pathOpen) ctx2d.stroke();
                    ctx2d.beginPath();
                    ctx2d.moveTo(seg.x * canvas.width, seg.y * canvas.height);
                    pathOpen = true;
                } else if (seg.type === 'move' && pathOpen) {
                    ctx2d.lineTo(seg.x * canvas.width, seg.y * canvas.height);
                    ctx2d.stroke();
                    ctx2d.beginPath();
                    ctx2d.moveTo(seg.x * canvas.width, seg.y * canvas.height);
                } else if (seg.type === 'end' && pathOpen) {
                    ctx2d.stroke();
                    pathOpen = false;
                }
            }
            if (pathOpen) ctx2d.stroke();
            ctx2d.globalAlpha = 1;

            this.#annotationRafId = requestAnimationFrame(loop);
        };
        this.#annotationRafId = requestAnimationFrame(loop);
    }

    #stopAnnotationRenderLoop() {
        if (this.#annotationRafId !== undefined) {
            cancelAnimationFrame(this.#annotationRafId);
            this.#annotationRafId = undefined;
        }
    }

    #cleanUpScreenShare() {
        if (this.#screenShareSender && this.#peerConnection) {
            try { this.#peerConnection.removeTrack(this.#screenShareSender); } catch { /* pc may already be closing */ }
        }
        this.#screenShareSender = undefined;
        this.#screenShareStream?.getTracks().forEach(t => t.stop());
        this.#screenShareStream = undefined;
        this.#removeAnnotationCanvas();
        this.#remoteScreenStream.setValue(null);
        this.#screenShareState.setValue('idle');
        if (this.#annotationChannel) {
            try { this.#annotationChannel.close(); } catch { /* channel may already be closed */ }
            this.#annotationChannel = undefined;
        }
    }

    #showScreenShareNotification(sharerKey: string, sharerName: string) {
        if (!this.#notificationCtx) return;
        this.#notificationCtx.stay('default', {
            elementName: 'contentlock-screenshare-notification',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { sharerKey, sharerName } as any,
        });
    }

    #cleanUpCall() {
        // Stop ringback tone (caller side)
        this.#stopRingback();

        // Clean up any active screen share (locally — peer was already notified or is gone)
        this.#cleanUpScreenShare();

        // Stop local microphone tracks
        this.#localStream?.getAudioTracks().forEach((t) => t.stop());
        this.#localStream = undefined;

        // Close the WebRTC peer connection
        this.#peerConnection?.close();
        this.#peerConnection = undefined;

        // Remove and clean up remote audio element
        if (this.#remoteAudioEl) {
            this.#remoteAudioEl.srcObject = null;
            document.body.removeChild(this.#remoteAudioEl);
            this.#remoteAudioEl = undefined;
        }

        // Dismiss any open incoming call notification
        this.#incomingCallNotificationHandler?.close();
        this.#incomingCallNotificationHandler = undefined;

        // Reset all call state
        this.#pendingCallInfo = undefined;
        this.#pendingIceCandidates = [];
        this.#callStartTime = undefined;
        this.#callState.setValue('idle');
        this.#remotePeer.setValue(undefined);
        this.#isMuted.setValue(false);
    }

    #updateIceServers(webRTC: WebRTCOptions) {
        this.#iceServers = webRTC.stunServers.map((url) => ({ urls: url } as RTCIceServer));
    }

    override async destroy(): Promise<void> {
        const state = this.#callState.getValue();
        if (state === 'incoming') {
            // In 'incoming' state #remotePeer is not yet set — the caller's key lives in
            // #pendingCallInfo instead. Use declineCall() so the caller is notified and
            // not left stuck waiting indefinitely with ringback audio playing.
            await this.declineCall();
        } else if (state !== 'idle') {
            await this.hangUp();
        }
        await super.destroy();
    }
}

export const CONTENTLOCK_WEBRTC_CONTEXT = new UmbContextToken<ContentLockWebRTCContext>('ContentLockWebRTCContext');
