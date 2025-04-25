import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
import { UMB_ENTITY_CONTEXT, UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';

export default class CanShowCommonActionsCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    #unique?: UmbEntityUnique;
    #currentUserUnique?: string;

    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        // TODO: Trying to fix the entity action for document lock/unlock
        // Fine inside the workspace top right, but still problematic with context menu in the tree/sidebar
        
        // Tried using a higher UMB_ENTIY_CONTEXT rather than the CONTENTLOCK_WORKSPACE_CONTEXT in case the sidebar could not consume it
        // So used the UMB_ENTITY_CONTEXT instead to pass the uniques into the SignalR Context, but this is not working either
        this.consumeContext(UMB_ENTITY_CONTEXT, (entityCtx) => {
            this.observe(entityCtx.unique, (unique) => {
                this.#unique = unique;
            });
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.currentUser, (currentUser) => {
                this.#currentUserUnique = currentUser?.unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            if(!this.#unique) {
                console.warn('Unique identifier of document is not available for SignalR context');
                return;
            }

            if(!this.#currentUserUnique) {
                console.warn('Current User Unique identifier is not available for SignalR context');
                return;
            }

            this.observe(observeMultiple([signalrCtx.isNodeLocked(this.#unique), signalrCtx.isNodeLockedByMe(this.#unique, this.#currentUserUnique)]), ([isNodeLocked, isNodeLockedByMe]) => {
                if (!isNodeLocked) {
                    // Node is unlocked - show the actions
                    this.permitted = true;
                } else if (isNodeLocked && isNodeLockedByMe) {
                    // Node is locked and locked by the current user - show the actions
                    this.permitted = true;
                } else {
                    // Otherwise, hide/remove the actions
                    this.permitted = false;
                }
            });
        });
    }
}

export const CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS = 'contentlock.condition.canShowCommonActions';