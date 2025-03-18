import { UMB_DOCUMENT_ENTITY_TYPE } from "@umbraco-cms/backoffice/document";
import { LockDocumentEntityAction } from "./lock.document.entityaction";
import { UnlockDocumentEntityAction } from "./unlock.document.entityaction";

export const manifests: Array<UmbExtensionManifest> = [
  {
    name: '[Content Lock] Lock Document Entity Action',
    alias: 'contentlock.entityaction.document.lock',
    type: 'entityAction',
    kind: 'default',
    api: LockDocumentEntityAction,
    weight: 400,
    meta: {
      label: 'Lock Document',
      icon: 'icon-combination-lock',
    },
    forEntityTypes: [ UMB_DOCUMENT_ENTITY_TYPE ],
  },
  {
    name: '[Content Lock] Unlock Document Entity Action',
    alias: 'contentlock.entityaction.document.unlock',
    type: 'entityAction',
    kind: 'default',
    api: UnlockDocumentEntityAction,
    weight: 401,
    meta: {
      label: 'Unlock Document',
      icon: 'icon-combination-lock-open',
    },
    forEntityTypes: [ UMB_DOCUMENT_ENTITY_TYPE ],
  }
];
