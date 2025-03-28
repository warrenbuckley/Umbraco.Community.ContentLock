import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbEntityActionArgs, UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { ContentLockService } from "../api";
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";

export class UnlockDocumentEntityAction extends UmbEntityActionBase<never> {
    
    #notificationCtx?: UmbNotificationContext;

    // Create a new instance of the controller and attach it to the element
    #localize = new UmbLocalizationController(this);

    constructor(host: UmbControllerHost, args: UmbEntityActionArgs<never>) {
        super(host, args);

        // Fetch/consume the contexts & assign to the private fields
        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this.#notificationCtx = notificationCtx;
        });
    }

    async execute() {
        if (!this.args.unique) {
            throw new Error('The document unique identifier is missing');
        }

        // Make HTTP API call
        const { error } = await ContentLockService.unlockContent({
            path: {
                key: this.args.unique
            }
        });

        if(error) {
            const errorResponse = error as ProblemDetailResponse;
            this.#notificationCtx?.peek('danger', {
                data: {
                    headline: errorResponse.title,
                    message: errorResponse.detail
                }
            });

            return;
        }

        // Update the context observables with the new state of the document
        // TODO: Do we need to do this anymore if SignalR pushes it back out?!
        // this.#lockCtx?.setIsLocked(false);
        // this.#lockCtx?.setIsLockedBySelf(false);
        // this.#lockCtx?.setLockedByName("");


        this.#notificationCtx?.peek('positive', {
            data: {
                headline: this.#localize.term('contentLockNotification_unlockedHeader'),
                message: this.#localize.term('contentLockNotification_unlockedMessage')
            }
        });
    }
}