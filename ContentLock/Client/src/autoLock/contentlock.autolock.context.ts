import { UmbContextBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { type UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentWorkspaceContext } from '@umbraco-cms/backoffice/document';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from '@umbraco-cms/backoffice/notification';
import { UmbLocalizationController } from '@umbraco-cms/backoffice/localization-api';
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';

export class ContentLockAutoLockContext extends UmbContextBase {

    #docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    #signalRContext?: ContentLockSignalrContext;
    #notificationCtx?: UmbNotificationContext;
    #localize = new UmbLocalizationController(this);

    #enabled = false;
    #heartbeatThrottleMs = 60000;
    #lastHeartbeat = 0;
    #unique?: string;
    #currentUserKey?: string;
    #isNodeLocked = false;
    #holdsAutoLock = false;

    constructor(host: UmbControllerHost) {
        super(host, CONTENTLOCK_AUTOLOCK_CONTEXT.toString());

        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this.#notificationCtx = notificationCtx;
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx?.unique, (currentUserKey) => {
                this.#currentUserKey = currentUserKey;
            }, 'contentLockAutoLockCurrentUser');
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalRContext) => {
            this.#signalRContext = signalRContext;

            this.observe(signalRContext?.EnableAutoLock, (enabled) => {
                this.#enabled = enabled ?? false;
            }, 'contentLockAutoLockEnabled');

            this.observe(signalRContext?.AutoLockHeartbeatSeconds, (seconds) => {
                this.#heartbeatThrottleMs = Math.max(5, seconds ?? 60) * 1000;
            }, 'contentLockAutoLockHeartbeat');

            this.observe(signalRContext?.lockUnlockedByUser, (evt) => this.#onUnlockedByOther(evt), 'contentLockAutoLockUnlockedByOther');
        });

        this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (docWorkspaceCtx) => {
            this.#docWorkspaceCtx = docWorkspaceCtx;

            this.observe(docWorkspaceCtx?.unique, (unique) => {
                const next = unique ?? undefined;
                if (next === this.#unique) return;

                if (this.#holdsAutoLock && this.#unique) {
                    this.#release(this.#unique);
                }

                this.#unique = next;
                this.#observeLockState();
            }, 'contentLockAutoLockUnique');

            this.observe(docWorkspaceCtx?.data, () => this.#evaluate(), 'contentLockAutoLockData');
        });
    }

    #observeLockState() {
        if (!this.#signalRContext || !this.#unique) return;
        this.observe(this.#signalRContext.isNodeLocked(this.#unique), (isLocked) => {
            this.#isNodeLocked = isLocked;
            if (!isLocked) {
                // Lock removed elsewhere — drop our claim so a later edit re-acquires
                this.#holdsAutoLock = false;
            }
        }, 'contentLockAutoLockIsLocked');
    }

    #onUnlockedByOther(evt?: { contentKey: string; unlockedByName: string; unlockedByKey: string }) {
        if (!evt || !this.#holdsAutoLock) return;
        if (evt.contentKey !== this.#unique) return;
        if (evt.unlockedByKey?.toLowerCase() === this.#currentUserKey?.toLowerCase()) return;

        this.#holdsAutoLock = false;
        this.#notificationCtx?.peek('warning', {
            data: {
                headline: this.#localize.term('contentLockNotification_unlockedByOtherHeader'),
                message: this.#localize.term('contentLockNotification_unlockedByOtherMessage', evt.unlockedByName),
            }
        });
    }

    #evaluate() {
        if (!this.#enabled || !this.#unique) return;
        if (this.#docWorkspaceCtx?.getIsNew()) return;

        const dirty = this.#docWorkspaceCtx?.getHasUnpersistedChanges() ?? false;

        if (dirty) {
            if (!this.#holdsAutoLock && !this.#isNodeLocked) {
                this.#acquire();
            } else if (this.#holdsAutoLock) {
                this.#heartbeat();
            }
        } else if (this.#holdsAutoLock) {
            this.#release();
        }
    }

    async #acquire() {
        const connection = this.#signalRContext?.signalrConnection;
        if (!connection || !this.#unique) return;

        this.#holdsAutoLock = true;
        this.#lastHeartbeat = Date.now();
        try {
            await connection.invoke('AcquireAutoLock', this.#unique);
        } catch {
            this.#holdsAutoLock = false;
        }
    }

    #heartbeat() {
        const now = Date.now();
        if (now - this.#lastHeartbeat < this.#heartbeatThrottleMs) return;
        this.#lastHeartbeat = now;

        const connection = this.#signalRContext?.signalrConnection;
        if (connection && this.#unique) {
            connection.invoke('AutoLockHeartbeat', this.#unique).catch(() => { });
        }
    }

    async #release(unique = this.#unique) {
        if (!this.#holdsAutoLock) return;
        this.#holdsAutoLock = false;

        const connection = this.#signalRContext?.signalrConnection;
        if (!connection || !unique) return;
        try {
            await connection.invoke('ReleaseAutoLock', unique);
        } catch {
            // Server-side disconnect cleanup / inactivity timeout releases it if this call fails
        }
    }

    override destroy(): void {
        this.#release(this.#unique);
        super.destroy();
    }
}

export const api = ContentLockAutoLockContext;

export const CONTENTLOCK_AUTOLOCK_CONTEXT = new UmbContextToken<ContentLockAutoLockContext>('ContentLockAutoLockContext');
