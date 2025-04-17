import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { ContentLockOverviewItem } from "../api";
import { observeMultiple, UmbArrayState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { ConnectedBackofficeUsers } from "../interfaces/ConnectedBackofficeUsers";
import { ContentLockOptions } from "../interfaces/ContentLockOptions";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{
    // SignalR Hub URL endpoint
    #CONTENT_LOCK_HUB_URL = '/umbraco/ContentLockHub';

    // Currently made this public so that any place consuming the context
    // Could stop the signalR connection or listen to any .On() events etc
    public signalrConnection? : signalR.HubConnection;

    // Used to store the overview of locks
    #contentLocks = new UmbArrayState<ContentLockOverviewItem>([], (item) => item.key);
    
    // Used to store the overview of locks
    #connectedBackofficeUsers = new UmbArrayState<ConnectedBackofficeUsers>([], (item) => item.userKey);

    // Used to store the options for the content lock package
    // Sets the default values for the options
    #contentLockOptions = new UmbObjectState<ContentLockOptions>(
        {
            onlineUsers: {
                enable: true,
                sounds: {
                    enable: true,
                    loginSound: '/App_Plugins/ContentLock/sounds/login.mp3',
                    logoutSound: '/App_Plugins/ContentLock/sounds/logout.mp3',
                }
            }
        });

    // All of the content locks as an observable array of ContentLockOverviewItem objects
    public contentLocks = this.#contentLocks.asObservable();

    // The total number of content locks as an observable number
    public totalContentLocks = this.#contentLocks.asObservablePart(data => data.length);

    // All of the connected users to the backoffice as an observable array of ConnectedBackofficeUsers objects
    public connectedUsers = this.#connectedBackofficeUsers.asObservable();

    // The total number of connected users to the backoffice as an observable number
    public totalConnectedUsers = this.#connectedBackofficeUsers.asObservablePart(users => users.length);

    /**
     * The total number of connected users to the backoffice as an observable number
     * This is the total number of connected users excluding the current user
     * @param currentUserKey - The key of the current user to exclude from the count
     */
    public totalConnectedOtherUsers(currentUserKey:string){
        return this.#connectedBackofficeUsers.asObservablePart((users) => {
            const otherUsers = users.filter(user => user.userKey !== currentUserKey);
            return otherUsers.length;
        });
    };

    // The entire options object as an observable
    public contentLockOptions = this.#contentLockOptions.asObservable();

    // The individual options as observables
    public EnableOnlineUsers = this.#contentLockOptions.asObservablePart(options => options.onlineUsers.enable);
    public EnableSounds = this.#contentLockOptions.asObservablePart(options => options.onlineUsers.sounds.enable);
    public LoginSound = this.#contentLockOptions.asObservablePart(options => options.onlineUsers.sounds.loginSound);
    public LogoutSound = this.#contentLockOptions.asObservablePart(options => options.onlineUsers.sounds.logoutSound);

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

                this.observe(observeMultiple([this.EnableSounds, this.LoginSound]), ([enableSounds, loginSound]) => {
                    if(enableSounds){
                        // Play a sound when a new user connects (Value is from AppSettings)
                        // Defaults to this sound
                        // https://freesound.org/s/352651/
                        let logonNotify = new Audio(loginSound);
                        logonNotify.play();
                    }
                });
            });

            this.signalrConnection.on('UserDisconnected', (connectedUserKey:string) => {
                this.#connectedBackofficeUsers.removeOne(connectedUserKey);

                this.observe(observeMultiple([this.EnableSounds, this.LogoutSound]), ([enableSounds, logoutSound]) => {
                    if(enableSounds){
                        // Play a sound when a user disconnects
                        // Defaults to this sound
                        // https://freesound.org/s/352651/
                        let logonNotify = new Audio(logoutSound);
                        logonNotify.play();
                    }
                });
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

            this.signalrConnection.on('ReceiveLatestOptions', (options:ContentLockOptions) =>{
                this.#contentLockOptions.setValue(options);
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
    }


    override async destroy(): Promise<void> {
        if (this.signalrConnection) {
            await this.signalrConnection.stop();
        }
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>('ContentLockSignalRContext');