import {  UmbConditionConfigBase, UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { client } from '../api/client.gen';
import { CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS } from '../conditions/CanShowCommonActions.Condition';

// load up the manifests here
export const onInit: UmbEntryPointOnInit = (_host, _extensionRegistry) => {

  // Will use only to add in Open API config with generated TS OpenAPI HTTPS Client
  // Do the OAuth token handshake stuff
  _host.consumeContext(UMB_AUTH_CONTEXT, async (authContext) => {

    // Get the token info from Umbraco
    const config = authContext.getOpenApiConfiguration();

    client.setConfig({
      baseUrl: config.base,
      credentials: config.credentials,
      auth: () => config.token(), // Dont need to use the interceptor approach anymore
    });

    // Add in our Content Lock conditions to existing Umbraco Core manifests
    // In order to hide/remove functionality such as publish, save, move 
    // that you should not be able to do in the UI when node is locked
    // NOTE: Umbraco does not expose these strings like other CONST/TOKENS hence alot of strings

    const extenionsToAddCondition = [
      'Umb.WorkspaceAction.Document.SaveAndPublish',  // Save & Publish - Button in footer
      'Umb.WorkspaceAction.Document.Save',            // Save - Button in footer
      'Umb.WorkspaceAction.Document.SaveAndPreview',  // Save & Preview - Button in footer

      'Umb.EntityAction.Document.Publish',            // Publish - Action from tree or actions top right
      'Umb.EntityAction.Document.Unpublish',          // Unpublish - Action from tree or actions top right
      'Umb.EntityAction.Document.RecycleBin.Trash',   // Trash - Action from tree or actions top right
      'Umb.EntityAction.Document.Rollback',           // Rollback - Action from tree or actions top right
      'Umb.EntityAction.Document.MoveTo',             // Move To - Action from tree or actions top right
      'Umb.EntityAction.Document.Delete',             // Delete - Action from tree or actions top right
      'Umb.EntityAction.Document.DuplicateTo',        // Duplicate To - Action from tree or actions top right
    ]

    // Add our Content Locked condition to the list of extensions
    const contentLockedCondition:UmbConditionConfigBase = {
      // Node is unlocked OR if locked then MUST be locked by you in order to be visible
      // Otherwise we hide the array of these common actions above
      alias: CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS, 
    };

    // Loop over the array above & append
    extenionsToAddCondition.forEach((extensionAlias) => {
      _extensionRegistry.appendCondition(extensionAlias, contentLockedCondition);
    });

  });
};

export const onUnload: UmbEntryPointOnUnload = (_host, _extensionRegistry) => {
  // If we needed to explicitly do any cleaning up then we would do it here
};
