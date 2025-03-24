import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

// TODO [BUG]: Perhaps the entity actions for default actions such as save, publish, move
// That are curently hiding in the tree actions but fine inside the document workspace/content node

// TODO: Does it need to be a GLOBAL context instead that then 
// keeps track of the unique node GUID and its state of isLocked and isLockedByYou perhaps ?

export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'ContentLock.WorkspaceContext',
        name: '[Content Lock] Workspace Context',
        type: 'workspaceContext',
        js: () => import('./contentlock.workspace.context'),
        weight: 200,
        conditions: [
            {
                alias: UMB_WORKSPACE_CONDITION_ALIAS, // Only load the Content Lock CTX when workspace is document
                match: UMB_DOCUMENT_WORKSPACE_ALIAS,
            }
        ]
    }
];
