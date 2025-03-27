import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import * as signalR from "@microsoft/signalr";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";

export default class ContentLockSignalrContext extends UmbContextBase<ContentLockSignalrContext>
{

    // Public so after ctor then anywhere consuming this context can use the connection
    public signalrConnection? : signalR.HubConnection;
    
    constructor(host: UmbControllerHost) {
        super(host, CONTENTLOCK_SIGNALR_CONTEXT);
        
        console.log('CTOR of signalr ctx - why NO get auth context');


        // Create a new SignalR connection in this context that we will expose
        // Then otherplaces can get this new'd up hub to send or receive messages
        this.signalrConnection = new signalR.HubConnectionBuilder()
        .withUrl("/umbraco/ContentLockHub")
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Trace)
        .build();

        this.startHub();

        // Need auth context to use the token to pass to SignalR hub
        // this.consumeContext(UMB_AUTH_CONTEXT, async (authCtx) => {

        //     console.log("Auth context consumed");

        //     // Create a new SignalR connection in this context that we will expose
        //     // Then otherplaces can get this new'd up hub to send or receive messages
        //     this.signalrConnection = new signalR.HubConnectionBuilder()
        //     .withUrl("/umbraco/chathub", {
        //         accessTokenFactory: authCtx.getOpenApiConfiguration().token
        //     })
        //     .withAutomaticReconnect()
        //     .configureLogging(signalR.LogLevel.Trace)
        //     .build();

        //     // Start the connection straight away
        //     await this.signalrConnection.start();
        //     console.log("SignalR connection started");

        //     // TODO: Drop code below once verified
        //     // As can do with onConnected event in C# hub

        //     // Call server to get initial state of all locks
        //     // const locks = await this.signalrConnection.invoke("GetAllLocks");
        //     // console.log("Got all locks", locks);

        //     const ping = await this.signalrConnection.invoke("Ping");
        //     console.log("Reply from calling ping", ping);
        // });
    }

    private async startHub() {
        if(this.signalrConnection) {
            // Start the connection straight away
            await this.signalrConnection.start();
            console.log("SignalR connection started");
        }
    }

    override hostDisconnected(): void {
        console.log("Signalr DOM Host disconnected");
    }

    override async destroy(): Promise<void> {
        console.log("SignalR DOM destory");

        if (this.signalrConnection) {
            await this.signalrConnection.stop();
        }
    }
}

export const CONTENTLOCK_SIGNALR_CONTEXT = new UmbContextToken<ContentLockSignalrContext>("ContentLockSignalRContext");