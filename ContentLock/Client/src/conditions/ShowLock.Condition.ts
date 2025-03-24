import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
 
export default class ShowLockCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {
            this.observe(contentLockWorkspaceCtx.isLocked, (isLocked) => {
                if(!isLocked){
                    // Node is NOT locked - show the lock action
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

export const CONTENTLOCK_SHOW_LOCK_CONDITION_ALIAS = 'contentlock.condition.showLock';
