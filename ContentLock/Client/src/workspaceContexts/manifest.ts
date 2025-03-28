import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

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
