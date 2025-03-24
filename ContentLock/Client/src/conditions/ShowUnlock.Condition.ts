import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
 
export default class ShowUnlockCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {
            
            this.observe(observeMultiple([contentLockWorkspaceCtx.isLocked, contentLockWorkspaceCtx.isLockedBySelf,]),([isLocked, isLockedBySelf]) => {
                if(isLocked && isLockedBySelf){
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
