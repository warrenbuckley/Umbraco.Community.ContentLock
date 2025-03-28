import { UMB_DOCUMENT_ENTITY_TYPE } from "@umbraco-cms/backoffice/document";

export const manifests: Array<UmbExtensionManifest> = [
  {
    name: '[Content Lock] User Permission',
    alias: 'ContentLock.UserPermission',
    type: 'entityUserPermission',
    forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
    weight: -1000,
    meta: {
        verbs: ['ContentLock.Unlocker'], // This is key persissted back to server & what we look up in a manifest condition or on the user itself
        group: 'Content Lock', // When umbraco supports this in the future we can use '#contentLockPermission_group'
        label: '#contentLockPermission_label',
        description: '#contentLockPermission_description'
    }
  }
];
