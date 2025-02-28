import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
 
export default class ContentIsLockedNotAllowedCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
 
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {

            this.observe(observeMultiple([contentLockWorkspaceCtx.isLocked, contentLockWorkspaceCtx.isLockedBySelf]), ([isLocked, isLockedBySelf]) =>{
                if(isLocked && !isLockedBySelf){
                    this.permitted = false;
                }
                else {
                    this.permitted = true;
                }
            });
        });
    }
}

export const CONTENTLOCK_IS_LOCKED_NOT_ALLOWED_CONDITION_ALIAS = 'contentlock.condition.isLocked.notallowed';
