import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { ContentLockOverviewItem } from "../api";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";
import { ConnectedBackofficeUsers } from "../interfaces/ConnectedBackofficeUsers";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{
    // Currently made this public so that any place consuming the context
    // Could stop the signalR connection or listen to any .On() events etc
    public signalrConnection? : signalR.HubConnection;

    // Used to store the overview of locks
    #contentLocks = new UmbArrayState<ContentLockOverviewItem>([], (item) => item.key);

    // Used to store the connected users of backoffice
    #connectedBackofficeUsers = new UmbArrayState<ConnectedBackofficeUsers>([], (item) => item.userKey);

    // Add a new state to track the number of other users viewing the same page
    #activePageUsers = new UmbArrayState<{ pageKey: string; viewerCount: number }>([], (item) => item.pageKey);

    // SignalR Hub URL endpoint
    #CONTENT_LOCK_HUB_URL = '/umbraco/ContentLockHub';

    // Locks
    public contentLocks = this.#contentLocks.asObservable();
    public totalContentLocks = this.#contentLocks.asObservablePart(data => data.length);

    // All Users
    public connectedUsers = this.#connectedBackofficeUsers.asObservable();
    public totalConnectedUsers = this.#connectedBackofficeUsers.asObservablePart(users => users.length);

    // Users on the current page
    public activePageUsers = this.#activePageUsers.asObservable();

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
            .configureLogging(signalR.LogLevel.Information)
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

            this.signalrConnection.on('UserConnected', (connectedUserKey:string, connectedUserName:string) => {
                this.#connectedBackofficeUsers.appendOne({ userKey: connectedUserKey, userName: connectedUserName });

                // TODO: Play a sound when a new user connects
                // Need to find a nice sound thats license free/open source and needs to be local
                let logonNotify = new Audio('https://cdn.freesound.org/previews/352/352651_4019029-lq.mp3');
                logonNotify.play();
            });

            this.signalrConnection.on('UserDisconnected', (connectedUserKey:string) => {
                this.#connectedBackofficeUsers.removeOne(connectedUserKey);

                // TODO: Play a sound when a new user disconnects
                // Need to find a nice sound thats license free/open source and needs to be local
                let logoffNotify = new Audio('https://cdn.freesound.org/previews/420/420521_8377667-lq.mp3');
                logoffNotify.play();
            });

            this.signalrConnection.on('ReceiveListOfConnectedUsers', (connectedUsers:{ [key: string]: string }) => {
                // Convert the object into an array of { userKey, userName }
                const usersArray = Object.entries(connectedUsers).map(([userKey, userName]) => ({
                    userKey,
                    userName,
                }));

                // Update the observable state with the new list of users
                this.#connectedBackofficeUsers.setValue(usersArray);
            });

            this.signalrConnection.on('ReceivePageViewCounts', (pageViewCounts: { [key: string]: number }) => {
                
                console.log('RECEIVED PAGE VIEW COUNTS', pageViewCounts);
                
                // Convert the object into an array of { pageKey, viewerCount }
                // const pageViewersArray = Object.entries(pageViewCounts).map(([pageKey, viewerCount]) => ({
                //     pageKey,
                //     viewerCount,
                // }));
            
                // Update the observable state with the initial list of page viewers
                //this.#activePageUsers.setValue(pageViewersArray);
            });

            // Listen for updates to the number of viewers for a page
            this.signalrConnection.on("UpdatePageViewers", (pageKey: string, viewerCount: number) => {
                console.log('UPDATE PAGE VIEWERS', pageKey, viewerCount);
                //this.#activePageUsers.appendOne({ pageKey, viewerCount });
            });

        }
    };

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
                return false;
            }
            else if(lock.checkedOutByKey === currentUserKey) {
                // Lock found and its locked by the current user
                return true;
            }
            else {
                // Lock found but not by the current user
                return false;
            }
        });
    };

    /**
     * 
     * @param currentUserKey 
     * @returns 
     */
    public totalConnectedOtherUsers(currentUserKey:string){
        return this.#connectedBackofficeUsers.asObservablePart((users) => {
            const otherUsers = users.filter(user => user.userKey !== currentUserKey);
            return otherUsers.length;
        });
    };

    /**
     * Get the number of other people viewing the same page as the current user
     * @param pageKey - The key of the page to get the viewer count for
     * @returns An observable of the viewer count for the page
     */
    public getPageViewerCount(pageKey:string) {
        return this.#activePageUsers.asObservablePart((pages) => {
            const page = pages.find((p) => p.pageKey === pageKey);
            if (page) {
                // Subtract 1 to exclude the current user (self) from the total count
                return page.viewerCount > 0 ? page.viewerCount - 1 : 0;
            }
            return 0;
        });
    };

    public async joinContentPage(pagekey: string) {
        if (this.signalrConnection) {
            // Send a message back to SignalR server that a user has joined a content node
            await this.signalrConnection.invoke('JoinPage', pagekey);
        }
    };

    public async leaveContentPage(pagekey: string) {
        if (this.signalrConnection) {
            // Send a message back to SignalR server that a user has left a content node
            await this.signalrConnection.invoke('LeavePage', pagekey);
        }
    }

    override async destroy(): Promise<void> {
        console.log('SignalR DOM destory - Kill the SignalR connection');

        if (this.signalrConnection) {
            await this.signalrConnection.stop();
        }
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>("ContentLockSignalRContext");