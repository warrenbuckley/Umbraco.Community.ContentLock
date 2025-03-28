import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbEntityActionArgs, UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { ContentLockService } from "../api";
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";

export class LockDocumentEntityAction extends UmbEntityActionBase<never> {
    
    #notificationCtx?: UmbNotificationContext;
    #lockCtx?: ContentLockWorkspaceContext;
    #currentUserName?: string;

    // Create a new instance of the controller and attach it to the element
    #localize = new UmbLocalizationController(this);

    constructor(host: UmbControllerHost, args: UmbEntityActionArgs<never>) {
        super(host, args);

        // Fetch/consume the contexts & assign to the private fields
        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this.#notificationCtx = notificationCtx;
        });

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (lockCtx) => {
            this.#lockCtx = lockCtx;
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.name, (name) => {
                this.#currentUserName = name;
            });  
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

        // Update the context observables with the new state of the document
        // TODO: Do we need to do this anymore if SignalR pushes it back out?!
        this.#lockCtx?.setIsLocked(true);
        this.#lockCtx?.setIsLockedBySelf(true);
        this.#lockCtx?.setLockedByName(this.#currentUserName ?? 'Unknown User');

        // Success notification
        this.#notificationCtx?.peek('positive', {
            data: {
                headline: this.#localize.term('contentLockNotification_lockedHeader'),
                message: this.#localize.term('contentLockNotification_lockedMessage')
            }
        });
    }
}