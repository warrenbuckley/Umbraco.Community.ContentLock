import { ILogger, LogLevel } from "@microsoft/signalr";
import { UmbClassInterface } from "@umbraco-cms/backoffice/class-api";
import { Observable } from "@umbraco-cms/backoffice/observable-api";

export class SignalrLogger implements ILogger {

    private _currentLogLevel?: LogLevel;

    constructor(host: UmbClassInterface, logLevelObservable: Observable<LogLevel>){
        // Use the `observe` method to subscribe to the log level observable
        host.observe(logLevelObservable, (logLevel) => {
            console.log(`SignalR Log Level changed to: ${logLevel}`);
            this._currentLogLevel = logLevel;
        });
    }
    
    log(logLevel: LogLevel, message: string) {
        // Only log messages that meet or exceed the current log level
        if (this._currentLogLevel !== undefined && logLevel >= this._currentLogLevel) {
            switch (logLevel) {
                case LogLevel.Trace:
                    console.info(`[Content Lock SignalR] TRACE: ${message}`);
                    break;
                case LogLevel.Debug:
                    console.debug(`[Content Lock SignalR] DEBUG: ${message}`);
                    break;
                case LogLevel.Information:
                    console.info(`[Content Lock SignalR] INFO: ${message}`);
                    break;
                case LogLevel.Warning:
                    console.warn(`[Content Lock SignalR] WARNING: ${message}`);
                    break;
                case LogLevel.Error:
                    console.error(`[Content Lock SignalR] ERROR: ${message}`);
                    break;
                case LogLevel.Critical:
                    console.error(`[Content Lock SignalR] CRITICAL: ${message}`);
                    break;
                default:
                    console.log(`[Content Lock SignalR] LOG: ${message}`);
                    break;
            }
        }
    }
}