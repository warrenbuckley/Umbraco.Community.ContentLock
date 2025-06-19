import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_ENTITY_CONTEXT, UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
 
export default class ShowLockCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    #unique?: UmbEntityUnique;

    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(UMB_ENTITY_CONTEXT,(entityCtx) => {
            this.observe(entityCtx?.unique, (unique) => {
                this.#unique = unique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT , (signalRCtx) => {
            if (!signalRCtx) {
                console.warn('SignalR context is not available.');
                return;
            }

            if(!this.#unique) {
                console.warn('Entity unique is not available.');
                return;
            }
            
            this.observe(signalRCtx.isNodeLocked(this.#unique?.toString()) , (isNodeLocked) => {
                if(isNodeLocked){
                    // Node is already locked - hide the lock action
                    this.permitted = false;
                }
                else {
                    // Otherwise we show it
                    this.permitted = true;
                }
            });
        });
    }
}

export const CONTENTLOCK_SHOW_LOCK_CONDITION_ALIAS = 'contentlock.condition.showLock';
