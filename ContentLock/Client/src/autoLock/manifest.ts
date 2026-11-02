import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'ContentLock.AutoLockWorkspaceContext',
        name: '[Content Lock] Auto Lock Workspace Context',
        type: 'workspaceContext',
        js: () => import('./contentlock.autolock.context'),
        weight: 190,
        conditions: [
            {
                alias: UMB_WORKSPACE_CONDITION_ALIAS,
                match: UMB_DOCUMENT_WORKSPACE_ALIAS,
            }
        ]
    }
];
