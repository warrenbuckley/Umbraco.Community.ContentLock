import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_WORKSPACE_CONTEXT } from '../workspaceContexts/contentlock.workspace.context';
import { observeMultiple } from '@umbraco-cms/backoffice/observable-api';
 
export default class ShowPreviewCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_WORKSPACE_CONTEXT , (contentLockWorkspaceCtx) => {
            
            this.observe(observeMultiple([contentLockWorkspaceCtx.isLocked, contentLockWorkspaceCtx.isLockedBySelf,]),([isLocked, isLockedBySelf]) => {
                if(isLocked && !isLockedBySelf){
                    // Node is locked  AND is NOT locked by self - show the preview action
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

export const CONTENTLOCK_SHOW_PREVIEW_CONDITION_ALIAS = 'contentlock.condition.showPreview';
