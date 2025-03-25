import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{

    // Public so after ctor then anywhere consuming this context can use the connection
    public signalrConnection? : signalR.HubConnection;
    
    constructor(host: UmbControllerHost) {
        super(host, CONTENTLOCK_SIGNALR_CONTEXT);
        
        // Need auth context to use the token to pass to SignalR hub
        this.consumeContext(UMB_AUTH_CONTEXT, async (authCtx) => {

            // Create a new SignalR connection in this context that we will expose
            // Then otherplaces can get this new'd up hub to send or receive messages
            this.signalrConnection = new signalR.HubConnectionBuilder()
            .withUrl("/umbraco/chathub", {
                accessTokenFactory: authCtx.getOpenApiConfiguration().token
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Trace)
            .build();

            // Start the connection straight away
            await this.signalrConnection.start();
            console.log("SignalR connection started");

            // TODO: Drop code below once verified
            // As can do with onConnected event in C# hub

            // Call server to get initial state of all locks
            // const locks = await this.signalrConnection.invoke("GetAllLocks");
            // console.log("Got all locks", locks);

            const ping = await this.signalrConnection.invoke("Ping");
            console.log("Reply from calling ping", ping);
        });
    }


    // Lifecycle stuff - probably need to destroy the connection when the context is destroyed?
    override hostConnected(): void {
        console.log("Host connected");
    }

    override hostDisconnected(): void {
        console.log("Host disconnected");
    }

    override destroy(): void {
        console.log("Destroying SignalR connection");
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>("ContentLockSignalRContext");