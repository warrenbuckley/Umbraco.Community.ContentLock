import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_ENTITY_CONTEXT, UmbEntityContext } from '@umbraco-cms/backoffice/entity';
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_CURRENT_USER_CONTEXT, UmbCurrentUserContext } from '@umbraco-cms/backoffice/current-user';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
import { filter, switchMap } from '@umbraco-cms/backoffice/external/rxjs';

export default class CanShowCommonActionsCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    #entityCtx?: UmbEntityContext;
    #currentUserCtx?: UmbCurrentUserContext;
    #signalrCtx?: ContentLockSignalrContext;

    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(UMB_ENTITY_CONTEXT, (entityCtx) => {
            // Store the reference to the context
            this.#entityCtx = entityCtx;

            // Try to setup observers each time a context is set
            this.trySetupObservers();
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            // Store the reference to the context
            this.#currentUserCtx = currentUserCtx;

            // Try to setup observers each time a context is set
            this.trySetupObservers();
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            // Store the reference to the context
            this.#signalrCtx = signalrCtx;

            // Try to setup observers each time a context is set
            this.trySetupObservers();
        });
    }

    trySetupObservers(): void {
        // Only setup observation when all contexts are available to use
        if (!this.#entityCtx || !this.#currentUserCtx || !this.#signalrCtx) {
            return;
        }

         this.observe(
            observeMultiple([
                this.#entityCtx?.unique,
                this.#currentUserCtx?.unique
            ]).pipe(
                // Filter out observable values being emitted where either value is undefined
                // No point in checking permissions if we don't have BOTH values
                filter(([documentUnique, currentUserUnique]) => !!documentUnique && !!currentUserUnique),
                    
                // switchMap takes the [documentUnique, currentUserUnique] pair and creates a NEW observable
                switchMap(([documentUnique, currentUserUnique]) => {
                    // This will return a NEW observable that watches for permission changes
                    return this.#signalrCtx!.userCanSeeCommonActions(documentUnique!, currentUserUnique!);
                })
            ),
            (canSeeCommonActions) => {
                // The final observable value from the switchMap - userCanSeeCommonActions
                this.permitted = canSeeCommonActions;
            },
            '_canShowCommonActionsConditionObserver' // Added an alias to the observer - The observer alias is meant to overwrite the subscription if a new context arrives
        );
    }
}

export const CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS = 'contentlock.condition.canShowCommonActions';