import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionCondition } from "@umbraco-cms/backoffice/extension-api";
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
 
export default class SettingsCondition extends UmbConditionBase<UmbConditionConfigBase> implements UmbExtensionCondition
{
    constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
        super(host, args);

        // TODO: Cant use currently as manifest for header apps does not support conditions array property
        // https://github.com/umbraco/Umbraco-CMS/issues/18979
        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT , (signalRCtx) => {
            this.observe(signalRCtx.EnableOnlineUsers, (enableOnlineUsers) => {
                if(enableOnlineUsers){
                    // Setting enabled - enable/allow the header app
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

export const CONTENTLOCK_ENABLE_ONLINE_USERS_CONDITION_ALIAS = 'contentlock.condition.enableOnlineUsers';
