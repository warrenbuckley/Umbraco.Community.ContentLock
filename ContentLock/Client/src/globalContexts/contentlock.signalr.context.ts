import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { ContentLockOverviewItem } from "../api";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{
    // Currently made this public so that any place consuming the context
    // Could stop the signalR connection or listen to any .On() events etc
    public signalrConnection? : signalR.HubConnection;

    // Used to store the overview of locks
    #contentLocks = new UmbArrayState<ContentLockOverviewItem>([], (item) => item.key);
    
    // SignalR Hub URL endpoint
    #CONTENT_LOCK_HUB_URL = '/umbraco/ContentLockHub';

    public contentLocks = this.#contentLocks.asObservable();
    public totalContentLocks = this.#contentLocks.asObservablePart(data => data.length);

    constructor(host: UmbControllerHost) {
        super(host, CONTENTLOCK_SIGNALR_CONTEXT);

        // Create a new SignalR connection in this context that we will expose
        // Then otherplaces can get this new'd up hub to send or receive messages

        // Need auth context to use the token to pass to SignalR hub
        this.consumeContext(UMB_AUTH_CONTEXT, async (authCtx) => {
            if (!authCtx) {
                console.error('Auth context is not available for SignalR connection');
                return;
            }

            // Create a new SignalR connection in this context that we will expose
            // Then otherplaces can get this new'd up hub to send or receive messages
            

            this.signalrConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.#CONTENT_LOCK_HUB_URL, { 
                accessTokenFactory: authCtx.getOpenApiConfiguration().token
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information) // TODO: Eventually turn this down to lower/normal level
            .build();

            this.#startHub();
        });
    }

    // Start the engines...
    async #startHub() {
        if(this.signalrConnection) {
            // Start the connection straight away
            await this.signalrConnection.start();

            // Listen to the server sending us events/data
            this.signalrConnection.on('ReceiveLatestContentLocks', (locks:Array<ContentLockOverviewItem>) => {
                // Update the observable with our data from the server
                this.#contentLocks.setValue(locks);
            });

            // SignalR server will send out a 'AddLockToClients' when someone locks an item
            this.signalrConnection.on('AddLockToClients', (contentLockInfo: ContentLockOverviewItem) => {
                this.#contentLocks.appendOne(contentLockInfo);
            });

            // SignalR server will send out a 'RemoveLockToClients' when someone removes an individual lock item
            this.signalrConnection.on('RemoveLockToClients', (contentKey:String) => {
                this.#contentLocks.removeOne(contentKey);
            });

            // SignalR server will send out a 'RemoveLocksToClients' when one or more locks are removed in bulk
            // This happens from the dashboard overview
            this.signalrConnection.on('RemoveLocksToClients', (contentKeys:Array<String>) => {
                this.#contentLocks.remove(contentKeys);
            });
        }
    }

    /**
     * Get a lock from the observable array of locks
     * @param key - The key of the lock to get
     * @returns An observable of a lock object or undefined if not found
     */
    public getLock(key: string) {
        return this.#contentLocks.asObservablePart((locks) => {
            const lock = locks.find((lock) => lock.key === key);
            return lock;
        });
    };

    /**
     * Check to see if a node is locked or not
     * @param nodeKey - The key of the node to check if its locked
     * @returns An observable bool
     */
    public isNodeLocked(nodeKey:string){
        return this.#contentLocks.asObservablePart((locks) => {
            const lock = locks.find((lock) => lock.key === nodeKey);
            if(lock){
                return true;
            }
            else {
                return false;
            }
        });
    }

    /**
     * Check to see if a node is locked by the current user or not
     * @param nodeKey - The key of the node to check if its locked by the current user
     * @param currentUserKey - The key of the current user to check if they have the lock
     * @returns An observable bool
     */
    public isNodeLockedByMe(nodeKey: string, currentUserKey: string) {
        return this.#contentLocks.asObservablePart((locks) => {
            const lock = locks.find(lock => lock.key === nodeKey);
            if(!lock){
                // No lock found - so its not even locked
                console.log('[IsNodeLockedByMe] No lock found for node:', nodeKey);
                return false;
            }
            else if(lock.checkedOutByKey === currentUserKey) {
                // Lock found and its locked by the current user
                console.log('[IsNodeLockedByMe] Lock found for node and its locked by SELF', nodeKey);
                return true;
            }
            else {
                // Lock found but not by the current user
                console.log('[IsNodeLockedByMe] Lock found but its locked BY SOMEONE else', nodeKey);
                return false;
            }
        });
    }


    override async destroy(): Promise<void> {
        console.log('SignalR DOM destory - Kill the SignalR connection');

        if (this.signalrConnection) {
            await this.signalrConnection.stop();
        }
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>("ContentLockSignalRContext");