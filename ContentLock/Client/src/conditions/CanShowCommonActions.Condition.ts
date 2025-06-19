import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_ENTITY_CONTEXT, UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';

export default class CanShowCommonActionsCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    #unique?: UmbEntityUnique;
    #currentUserUnique?: string;

    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(UMB_ENTITY_CONTEXT, (entityCtx) => {
            this.observe(entityCtx?.unique, (unique) => {
                this.#unique = unique;
            });
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx?.currentUser, (currentUser) => {
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

            if (!signalrCtx) {
                console.warn('Content Lock SignalR Context is not available');
                return;
            }

            this.observe(signalrCtx?.userCanSeeCommonActions(this.#unique, this.#currentUserUnique), (canSeeCommonActions) => {
                console.log('Can see common actions RESULT =', canSeeCommonActions);
                this.permitted = canSeeCommonActions;
            });
        });
    }
}

export const CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS = 'contentlock.condition.canShowCommonActions';