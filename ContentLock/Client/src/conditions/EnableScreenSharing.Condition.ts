import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';

export default class EnableScreenSharingCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            this.observe(signalrCtx?.EnableScreenSharing, (enableScreenSharing) => {
                this.permitted = enableScreenSharing === true;
            });
        });
    }
}

export const CONTENTLOCK_ENABLE_SCREEN_SHARING_CONDITION_ALIAS = 'contentlock.condition.enableScreenSharing';
