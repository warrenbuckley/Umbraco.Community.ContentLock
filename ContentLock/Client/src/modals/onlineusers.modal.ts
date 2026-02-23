import { css, customElement, html, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UmbModalRejectReason } from "@umbraco-cms/backoffice/modal";
import { OnlineUsersModalData, OnlineUsersModalValue } from "./onlineusers.modal.token";
import { UmbUserItemModel, UmbUserItemRepository } from "@umbraco-cms/backoffice/user";
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { CONTENTLOCK_WEBRTC_CONTEXT } from "../webrtc/contentlock.webrtc.context";
import type ContentLockWebRTCContext from "../webrtc/contentlock.webrtc.context";

@customElement("contentlock-onlineusers-modal")
export class OnlineUsersModalElement extends UmbModalBaseElement<OnlineUsersModalData, OnlineUsersModalValue>
{
    @state()
    _connectedUsersModels?: UmbUserItemModel[] = [];

    @state()
    _connectedUserKeys: string[] = [];

    @state()
    _currentUserKey?: string;

    @state()
    _inCallUserKeys: string[] = [];

    @state()
    _webRTCEnabled = false;

    @state()
    _currentCallState: string = 'idle';

    #userItemRepository = new UmbUserItemRepository(this);
    #webrtcCtx?: ContentLockWebRTCContext;

    constructor() {
        super();

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx?.unique, (unique) => {
                this._currentUserKey = unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            // The list of GUID connected users as keys/uniques
            this.observe(signalrCtx?.connectedUserKeys, async (connectedUserKeys) => {
                if(connectedUserKeys) {
                    this._connectedUserKeys = connectedUserKeys;

                    // Get users from the repo
                    const userItems = (await this.#userItemRepository.requestItems(connectedUserKeys));
                    this._connectedUsersModels = userItems?.data;
                }
            });

            // Track which users are currently in an active WebRTC call
            this.observe(signalrCtx?.inCallUserKeys, (keys) => {
                this._inCallUserKeys = keys ?? [];
            });

            // Reactively hide call buttons when WebRTC is disabled in options
            this.observe(signalrCtx?.contentLockOptions, (options) => {
                this._webRTCEnabled = options?.webRTC?.enable ?? false;
            });
        });

        this.consumeContext(CONTENTLOCK_WEBRTC_CONTEXT, (webrtcCtx) => {
            this.#webrtcCtx = webrtcCtx;

            // Disable the call button while the local user is already in a call
            this.observe(webrtcCtx?.callState, (state) => {
                this._currentCallState = state ?? 'idle';
            });
        });
    }

    #handleClose() {
        this.modalContext?.reject({ type: "close" } as UmbModalRejectReason);
    }

    #handleCall(user: UmbUserItemModel) {
        if (!user.unique) return;
        this.#webrtcCtx?.initiateCall(user.unique, user.name ?? '', user.avatarUrls ?? []);
        // Close the modal so the widget is visible immediately
        this.#handleClose();
    }

    render() {
        return html`
            <umb-body-layout headline=${this.localize.term('contentLockUsersModal_modalHeader')}>
                <uui-box headline=${this.localize.term('contentLockUsersModal_listOfUsers')}>
                    ${this._connectedUsersModels?.map((user) => {
                        const isSelf = user.unique === this._currentUserKey;
                        const isInCall = this._inCallUserKeys.includes(user.unique ?? '');
                        const callerBusy = this._currentCallState !== 'idle';

                        return html`
                            <div class="user-detail">
                                <umb-user-avatar name="${user.name}" .imgUrls=${user.avatarUrls ?? []}></umb-user-avatar>
                                <span class="user-name">${user.name}</span>

                                <!-- Show a tag if the user is the current user -->
                                ${isSelf
                                    ? html`<uui-tag color="default" look="outline"><umb-localize key="contentLockUsersModal_youLabel">You</umb-localize></uui-tag>`
                                    : nothing
                                }

                                <!-- Busy tag if the remote user is already in a call -->
                                ${!isSelf && isInCall
                                    ? html`<uui-tag color="warning" look="default">
                                            <uui-icon name="icon-phone"></uui-icon>
                                            <umb-localize key="contentLockCall_busyIndicator">On a call</umb-localize>
                                        </uui-tag>`
                                    : nothing
                                }

                                <!-- Call button — only shown for other users when WebRTC is enabled -->
                                ${!isSelf && this._webRTCEnabled
                                    ? html`<uui-button
                                            compact
                                            look="outline"
                                            class="call-btn"
                                            label=${this.localize.term('contentLockCall_callButton')}
                                            title=${this.localize.term('contentLockCall_callButton')}
                                            ?disabled=${isInCall || callerBusy}
                                            @click=${() => this.#handleCall(user)}>
                                            <uui-icon name="icon-phone"></uui-icon>
                                        </uui-button>`
                                    : nothing
                                }
                            </div>
                        `;
                    })}
                </uui-box>

                <div slot="actions">
                    <uui-button id="close" label="Close" @click=${this.#handleClose}>${this.localize.term('general_close')}</uui-button>
                </div>
            </umb-body-layout>
        `;
    }

    static styles = css`
        uui-box {
            margin-bottom: 1rem;
        }

        umb-property-layout {
            padding-top:0;
            padding-bottom:0;
        }

        .user-detail {
            display: flex;
            align-items: center;
            gap: var(--uui-size-4);
            margin: var(--uui-size-3) 0;
        }

        .user-detail:last-child {
            margin-bottom: 0;
        }

        .user-name {
            flex: 1;
        }

        uui-avatar {
            font-size: var(--uui-size-6);
        }

        .call-btn {
            margin-left: auto;
        }
    `;
}

export default OnlineUsersModalElement;