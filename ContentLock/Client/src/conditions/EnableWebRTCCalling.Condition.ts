import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';

export default class EnableWebRTCCallingCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalrCtx) => {
            this.observe(signalrCtx?.EnableWebRTC, (enableWebRTC) => {
                if(enableWebRTC){
                     // Setting enabled - enable/allow the calling features
                    this.permitted = true;
                }
                else {
                    // Otherwise we hide/remove them
                    this.permitted = false;
                }
            });
        });
    }
}

export const CONTENTLOCK_ENABLE_WEBRTC_CALLING_CONDITION_ALIAS = 'contentlock.condition.enableWebRTCCalling';
