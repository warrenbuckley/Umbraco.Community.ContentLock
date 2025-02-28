export const manifests: Array<UmbExtensionManifest> = [
    {
        alias: 'ContentLock.WorkspaceContext',
        name: '[Content Lock] Workspace Context',
        type: 'workspaceContext',
        js: () => import('./contentlock.workspace.context'),
        weight: 200,
        conditions: [
            {
                alias: 'Umb.Condition.WorkspaceAlias', // Only load the Content Lock CTX when workspace is document
                match: 'Umb.Workspace.Document', // TODO: Is there a CONST we can use?
            }
        ]
    }
];
