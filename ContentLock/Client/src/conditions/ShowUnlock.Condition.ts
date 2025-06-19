import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
import { UMB_ENTITY_CONTEXT, UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
 
export default class ShowUnlockCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    #documentUnique?: UmbEntityUnique;
    #currentUser?: string;

    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(UMB_ENTITY_CONTEXT,(entityCtx) => {
            this.observe(entityCtx?.unique, (unique) => {
                this.#documentUnique = unique;
            });
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT,(currentUserCtx) => {
            this.observe(currentUserCtx?.unique, (currentUserUnique) => {
                this.#currentUser = currentUserUnique;
            });
        });

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT , (signalRCtx) => {
            if (!signalRCtx) {
                console.warn('SignalR context is not available.');
                return;
            }

            if(!this.#documentUnique) {
                console.warn('Entity unique is not available.');
                return;
            }

            if(!this.#currentUser) {
                console.warn('Current User unique is not available.');
                return;
            }

            this.observe(observeMultiple([signalRCtx.isNodeLocked(this.#documentUnique?.toString()), signalRCtx.isNodeLockedByMe(this.#documentUnique?.toString(), this.#currentUser)]), ([isNodeLocked, isLockedBySelf]) => {
                if(isNodeLocked && isLockedBySelf){
                    // Node is locked by self - show the unlock action
                    this.permitted = true;
                }
                else {
                    // Otherwise we hide/remove it
                    this.permitted = false;
                }
            });
        });
    }
}

export const CONTENTLOCK_SHOW_UNLOCK_CONDITION_ALIAS = 'contentlock.condition.showUnlock';
