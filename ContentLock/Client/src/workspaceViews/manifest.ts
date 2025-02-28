export const manifests: Array<UmbExtensionManifest> = [
  {
    alias: 'contentlock.workspaceview',
    name: '[Content Lock] Workspace View',
    type: 'workspaceView',
    js: () => import('./contentlock.workspaceview'),
    weight: 199,
    meta: {
        label: 'Content Lock',
        icon: 'icon-lock',
        pathname: 'content-lock'
    },
    conditions: [
        {
            alias: 'Umb.Condition.SectionAlias',
            match: 'Umb.Section.Content'
        },
        {
            alias: "Umb.Condition.WorkspaceAlias",
            match: "Umb.Workspace.Document"
        }
    ]
  }
];
