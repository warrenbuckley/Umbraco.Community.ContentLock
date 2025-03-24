import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';

export default class CanShowCommonActionsCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {
            
            if(!contentLockWorkspaceCtx) {
                console.error('Content Lock Workspace Context is not available');
                alert('Content Lock Workspace Context is not available');
            }

            console.log('Can I get CTX for locks in condition', contentLockWorkspaceCtx);
            
            this.observe(observeMultiple([contentLockWorkspaceCtx.isLocked, contentLockWorkspaceCtx.isLockedBySelf]), ([isLocked, isLockedBySelf]) => {
                
                console.log('hmm isLocked & isLockedBySelf', isLocked, isLockedBySelf);
                console.log('host thing', args.host);

                if (!isLocked) {
                    // Node is unlocked - show the actions
                    this.permitted = true;
                } else if (isLocked && isLockedBySelf) {
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