import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbEntityActionArgs, UmbEntityActionBase, UmbRequestReloadStructureForEntityEvent } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_ACTION_EVENT_CONTEXT } from "@umbraco-cms/backoffice/action";
import { ContentLockService } from "../api";
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";

export class LockDocumentEntityAction extends UmbEntityActionBase<never> {
    
    #notificationCtx?: UmbNotificationContext;

    // Create a new instance of the controller and attach it to the element
    #localize = new UmbLocalizationController(this);

    constructor(host: UmbControllerHost, args: UmbEntityActionArgs<never>) {
        super(host, args);

        this.getContext(UMB_NOTIFICATION_CONTEXT).then((notificationCtx) => {
            this.#notificationCtx = notificationCtx;
        });
    }

    async execute() {
        if (!this.args.unique) {
            throw new Error('The document unique identifier is missing');
        }

        // Make API call
        const { error } = await ContentLockService.lockContent({
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

        // Success notification
        this.#notificationCtx?.peek('positive', {
            data: {
                headline: this.#localize.term('contentLockNotification_lockedHeader'),
                message: this.#localize.term('contentLockNotification_lockedMessage')
            }
        });

        // Close the action menu by dispatching the proper event
        await this.#dispatchReloadEvent();
    }

    async #dispatchReloadEvent() {
        const actionEventContext = await this.getContext(UMB_ACTION_EVENT_CONTEXT);
        if (!actionEventContext) return;
        
        const event = new UmbRequestReloadStructureForEntityEvent({
            unique: this.args.unique,
            entityType: this.args.entityType,
        });

        actionEventContext.dispatchEvent(event);
    }
}