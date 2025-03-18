//import { CONTENTLOCK_IS_LOCKED_NOT_ALLOWED_CONDITION_ALIAS } from "../conditions/ContentLocked.NotAllowed.Condition";

import { UMB_CONTENT_SECTION_ALIAS } from '@umbraco-cms/backoffice/content';
import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

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
      }
    ]
  }
];
