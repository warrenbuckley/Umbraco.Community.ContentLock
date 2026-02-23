import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import type { WebRTCOptions } from "../interfaces/ContentLockOptions";

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

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

export default class ContentLockWebRTCContext extends UmbContextBase {

    // ── Observable State ──────────────────────────────────────────────────

    #callState = new UmbObjectState<CallState>('idle');
    #remotePeer = new UmbObjectState<RemotePeerInfo | undefined>(undefined);
    #isMuted = new UmbObjectState<boolean>(false);

    public callState = this.#callState.asObservable();
    public remotePeer = this.#remotePeer.asObservable();
    public isMuted = this.#isMuted.asObservable();

    // ── Private State ─────────────────────────────────────────────────────

    #peerConnection?: RTCPeerConnection;
    #localStream?: MediaStream;
    #remoteAudioEl?: HTMLAudioElement;
    #callWidgetEl?: HTMLElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #incomingCallNotificationHandler?: any;
    #pendingCallInfo?: PendingCallInfo;
    #pendingIceCandidates: RTCIceCandidateInit[] = [];
    #callStartTime?: Date;
    #iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ];

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

            // Keep ICE servers in sync with reactive options
            this.observe(signalrCtx.contentLockOptions, (options) => {
                if (options?.webRTC) {
                    this.#updateIceServers(options.webRTC);
                }
            });

            // SignalR connection is established asynchronously after auth.
            // Poll until the connection is ready, then attach WebRTC event listeners.
            this.#waitForConnectionAndAttach(signalrCtx);
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
            this.#localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.#peerConnection = this.#createPeerConnection(targetUserKey);

            for (const track of this.#localStream.getAudioTracks()) {
                this.#peerConnection.addTrack(track, this.#localStream);
            }

            const offer = await this.#peerConnection.createOffer();
            await this.#peerConnection.setLocalDescription(offer);

            await this.#signalrCtx?.signalrConnection?.invoke('SendCallOfferAsync', targetUserKey, offer.sdp);
        } catch (err) {
            console.error('[ContentLock WebRTC] Failed to initiate call:', err);
            this.#cleanUpCall();
            this.#showPeekNotification('danger', 'Failed to start call. Please check microphone permissions.');
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

        // Set remote peer info from pending call (avatarUrls not available at this point,
        // umb-user-avatar will render initials as fallback)
        this.#remotePeer.setValue({ key: callerKey, name: callerName, avatarUrls: [] });

        try {
            this.#localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.#peerConnection = this.#createPeerConnection(callerKey);

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
            this.#showCallWidget();
        } catch (err) {
            console.error('[ContentLock WebRTC] Failed to accept call:', err);
            this.#cleanUpCall();
            this.#showPeekNotification('danger', 'Failed to start call. Please check microphone permissions.');
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

    #waitForConnectionAndAttach(signalrCtx: typeof CONTENTLOCK_SIGNALR_CONTEXT.TYPE) {
        const interval = setInterval(() => {
            const conn = signalrCtx.signalrConnection;
            if (conn) {
                clearInterval(interval);
                this.#attachSignalRListeners(conn);
            }
        }, 50);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #attachSignalRListeners(connection: any) {
        // Incoming call offer from another user
        connection.on('ReceiveCallOffer', async (callerKey: string, callerName: string, sdpOffer: string) => {
            this.#pendingCallInfo = { callerKey, callerName, sdpOffer };
            this.#callState.setValue('incoming');
            await this.#showIncomingCallNotification(callerKey, callerName);
        });

        // Callee accepted — SDP answer received by the caller
        connection.on('ReceiveCallAnswer', async (sdpAnswer: string) => {
            if (!this.#peerConnection) return;

            await this.#peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer })
            );
            await this.#flushPendingIceCandidates();

            this.#callState.setValue('connected');
            this.#callStartTime = new Date();
            this.#showCallWidget();
        });

        // ICE candidate from the remote peer
        connection.on('ReceiveIceCandidate', async (candidate: string, sdpMid: string | null, sdpMLineIndex: number | null) => {
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
        connection.on('CallDeclined', () => {
            const peerName = this.#remotePeer.getValue()?.name ?? 'User';
            this.#cleanUpCall();
            this.#showPeekNotification('default', `${peerName} declined the call`);
        });

        // Other party ended or dropped the call
        connection.on('CallEnded', () => {
            this.#cleanUpCall();
            this.#showPeekNotification('default', 'Call ended');
        });

        // Target user is already in another call
        connection.on('CallBusy', () => {
            const peerName = this.#remotePeer.getValue()?.name ?? 'User';
            this.#cleanUpCall();
            this.#showPeekNotification('warning', `${peerName} is currently on another call`);
        });
    }

    // ── Private: WebRTC Peer Connection ───────────────────────────────────

    #createPeerConnection(peerUserKey: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({ iceServers: this.#iceServers });

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

        // Play remote audio track when it arrives from the peer
        pc.ontrack = (event) => {
            if (!this.#remoteAudioEl) {
                this.#remoteAudioEl = Object.assign(document.createElement('audio'), { autoplay: true });
                document.body.appendChild(this.#remoteAudioEl);
            }
            this.#remoteAudioEl.srcObject = event.streams[0];
        };

        return pc;
    }

    async #flushPendingIceCandidates() {
        if (!this.#peerConnection || this.#pendingIceCandidates.length === 0) return;

        for (const init of this.#pendingIceCandidates) {
            await this.#peerConnection.addIceCandidate(new RTCIceCandidate(init));
        }
        this.#pendingIceCandidates = [];
    }

    // ── Private: UI ───────────────────────────────────────────────────────

    async #showIncomingCallNotification(callerKey: string, callerName: string) {
        if (!this.#notificationCtx) return;

        // Ensure the custom element is registered before Umbraco tries to create it
        await import('./contentlock-incoming-call-notification.element.js');

        this.#incomingCallNotificationHandler = this.#notificationCtx.stay('default', {
            elementName: 'contentlock-incoming-call-notification',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { callerKey, callerName } as any,
        });
    }

    #showPeekNotification(color: 'default' | 'positive' | 'warning' | 'danger', message: string) {
        this.#notificationCtx?.peek(color, { data: { message } });
    }

    #showCallWidget() {
        import('./contentlock-active-call.element.js').then(() => {
            // Remove any existing widget (e.g. after a reconnect)
            if (this.#callWidgetEl) {
                document.body.removeChild(this.#callWidgetEl);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const widget: any = document.createElement('contentlock-active-call-widget');
            widget.webrtcContext = this;
            document.body.appendChild(widget);
            this.#callWidgetEl = widget;

            widget.addEventListener('call-hangup', () => this.hangUp());
            widget.addEventListener('call-mute-toggle', () => this.toggleMute());
            widget.addEventListener('call-devices-changed', (e: CustomEvent) => {
                this.setAudioDevices(e.detail.micId, e.detail.speakerId);
            });
        });
    }

    #cleanUpCall() {
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

        // Remove the active call widget
        if (this.#callWidgetEl) {
            document.body.removeChild(this.#callWidgetEl);
            this.#callWidgetEl = undefined;
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
        this.#iceServers = [
            ...webRTC.stunServers.map((url) => ({ urls: url } as RTCIceServer)),
            ...webRTC.turnServers.map((t) => ({
                urls: t.urls,
                username: t.username,
                credential: t.credential,
            } as RTCIceServer)),
        ];
    }

    override async destroy(): Promise<void> {
        // Ensure the call is ended if this context is destroyed (e.g. user navigates away)
        if (this.#callState.getValue() !== 'idle') {
            await this.hangUp();
        }
        await super.destroy();
    }
}

export const CONTENTLOCK_WEBRTC_CONTEXT = new UmbContextToken<ContentLockWebRTCContext>('ContentLockWebRTCContext');
