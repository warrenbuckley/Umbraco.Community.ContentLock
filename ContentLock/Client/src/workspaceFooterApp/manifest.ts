import { UMB_CONTENT_SECTION_ALIAS } from '@umbraco-cms/backoffice/content';
import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';
import { CONTENTLOCK_SHOW_LOCKED_STATUS_CONDITION_ALIAS } from '../conditions/ShowLockedStatus.Condition';

export const manifests: Array<UmbExtensionManifest> = [
  {
    alias: 'contentlock.workspacefooterapp',
    name: '[Content Lock] Workspace Footer App',
    type: 'workspaceFooterApp',
    js: () => import('./contentlock.workspacefooterapp'),
    weight: 199,
    conditions: [
      {
        alias: 'Umb.Condition.SectionAlias',
        match: UMB_CONTENT_SECTION_ALIAS
      },
      {
        alias: UMB_WORKSPACE_CONDITION_ALIAS,
        match: UMB_DOCUMENT_WORKSPACE_ALIAS
      },
      {
        alias: CONTENTLOCK_SHOW_LOCKED_STATUS_CONDITION_ALIAS // Node is locked (even if it's locked by you)
      }
    ]
  }
];
