import { UMB_CONTENT_SECTION_ALIAS } from '@umbraco-cms/backoffice/content';
import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

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
            match: UMB_CONTENT_SECTION_ALIAS
        },
        {
            alias: UMB_WORKSPACE_CONDITION_ALIAS,
            match: UMB_DOCUMENT_WORKSPACE_ALIAS
        }
    ]
  }
];
