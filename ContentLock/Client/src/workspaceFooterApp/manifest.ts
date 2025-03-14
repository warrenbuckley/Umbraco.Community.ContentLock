//import { CONTENTLOCK_IS_LOCKED_NOT_ALLOWED_CONDITION_ALIAS } from "../conditions/ContentLocked.NotAllowed.Condition";

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
        match: 'Umb.Section.Content'
      },
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.Document"
      }
    ]
  }
];
