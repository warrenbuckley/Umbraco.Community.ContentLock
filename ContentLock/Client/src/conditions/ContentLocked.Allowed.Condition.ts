import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
 
export default class ContentIsLockedAllowedCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {
            this.observe(contentLockWorkspaceCtx.isLocked, (isLocked) => {
                if(isLocked){
                    this.permitted = true;
                }
                else {
                    this.permitted = false;
                }
            });
        });
    }
}

export const CONTENTLOCK_IS_LOCKED_ALLOWED_CONDITION_ALIAS = 'contentlock.condition.isLocked.allowed';
