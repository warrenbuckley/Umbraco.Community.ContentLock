import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbEntityActionArgs, UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { ContentLockService } from "../api";
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";

export class UnlockDocumentEntityAction extends UmbEntityActionBase<never> {
    
    private _notificationCtx?: UmbNotificationContext;
    private _lockCtx?: ContentLockWorkspaceContext;

    constructor(host: UmbControllerHost, args: UmbEntityActionArgs<never>) {
        super(host, args);

        // Fetch/consume the contexts & assign to the private fields
        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this._notificationCtx = notificationCtx;
        });

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (lockCtx) => {
            this._lockCtx = lockCtx;
        });
    }

    async execute() {
        if (!this.args.unique) {
            throw new Error('The document unique identifier is missing');
        }

        // Make API call
        const { error } = await ContentLockService.unlockContent({
            path: {
                key: this.args.unique
            }
        });

        if(error) {
            const errorResponse = error as ProblemDetailResponse;
            this._notificationCtx?.peek('danger', {
                data: {
                    headline: errorResponse.title,
                    message: errorResponse.detail
                }
            });

            return;
        }

        // Update the context observables with the new state of the document
        this._lockCtx?.setIsLocked(false);
        this._lockCtx?.setIsLockedBySelf(false);
        this._lockCtx?.setLockedByName("");


        this._notificationCtx?.peek('positive', {
            data: {
                headline: 'Document Unlocked',
                message: 'The document has been unlocked, to allow other users to edit.'
            }
        });
    }
}