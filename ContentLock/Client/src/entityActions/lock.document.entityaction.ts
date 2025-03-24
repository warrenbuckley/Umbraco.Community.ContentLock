import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbEntityActionArgs, UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { ContentLockService } from "../api";
import { CONTENTLOCK_WORKSPACE_CONTEXT, ContentLockWorkspaceContext } from "../workspaceContexts/contentlock.workspace.context";
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";

export class LockDocumentEntityAction extends UmbEntityActionBase<never> {
    
    private _notificationCtx?: UmbNotificationContext;
    private _lockCtx?: ContentLockWorkspaceContext;
    private _currentUserName?: string;

    constructor(host: UmbControllerHost, args: UmbEntityActionArgs<never>) {
        super(host, args);

        // Fetch/consume the contexts & assign to the private fields
        this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
            this._notificationCtx = notificationCtx;
        });

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT, (lockCtx) => {
            this._lockCtx = lockCtx;
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.name, (name) => {
                this._currentUserName = name;
            });  
        }):
    }

    async execute() {
        if (!this.args.unique) {
            throw new Error("The document unique identifier is missing");
        }

        // Make API call
        const { error } = await ContentLockService.lockContent({
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
        this._lockCtx?.setIsLocked(true);
        this._lockCtx?.setIsLockedBySelf(true);
        this._lockCtx?.setLockedByName(this._currentUserName ?? 'Unknown User');

        // Success notification
        this._notificationCtx?.peek('positive', {
            data: {
                headline: 'Document Locked',
                message: 'The document has been locked for you to edit.'
            }
        });
    }
}