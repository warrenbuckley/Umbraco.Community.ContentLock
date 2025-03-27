import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { ContentLockOverview, ContentLockOverviewItem } from "../api";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{
    // Currently made this public so that any place consuming the context
    // Could stop the signalR connection or listen to any .On() events etc
    public signalrConnection? : signalR.HubConnection;

    // Used to store the overview of locks
    #contentLocks = new UmbArrayState<ContentLockOverviewItem>([], (item) => item.key);
    
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
            .withUrl("/umbraco/ContentLockHub", { // TODO: Move this URL to a const ?
                accessTokenFactory: authCtx.getOpenApiConfiguration().token
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Trace) // TODO: Eventually turn this down to lower/normal level
            .build();

            this.#startHub();
        });
    }

    // Start the engines...
    async #startHub() {
        if(this.signalrConnection) {
            // Start the connection straight away
            await this.signalrConnection.start();
            console.log('SignalR connection started');

            // Listen to the server sending us events/data
            this.signalrConnection.on('ReceiveLatestContentLocks', (locks:ContentLockOverview) => {
                // Update the observable with our data from the server
                this.#contentLocks.setValue(locks.items);
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
            this.signalrConnection.on('RemoveLockToClients', (contentKeys:Array<String>) => {
                this.#contentLocks.remove(contentKeys);
            });
        }
    }

    // Places around the UI can consume this context and see if a node is locked or not
    public isNodeLocked(nodeKey: string) : boolean {
        const lock = this.#contentLocks.getValue().find((lock) => lock.key === nodeKey);

        // Found the lock in our array observable
        if(lock){
            return true;
        }
        else {
            return false;
        }
    }

    // Places around the UI can consume this context and see if a node is locked or not
    public isNodeLockedByMe(nodeKey: string, currentUserKey: string): boolean {
        const lock = this.#contentLocks.getValue().find(lock => lock.key === nodeKey);
        if(!lock){
            // No lock found - so its not even locked
            return false;
        }
        else if(lock.checkedOutBy === currentUserKey) {
            // Lock found and its locked by the current user
            return true;
        }
        else {
            // Lock found but not by the current user
            return false;
        }
    }


    override async destroy(): Promise<void> {
        console.log("SignalR DOM destory");

        if (this.signalrConnection) {
            await this.signalrConnection.stop();
        }
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>("ContentLockSignalRContext");