import { UMB_ENTITY_IS_NOT_TRASHED_CONDITION_ALIAS } from '@umbraco-cms/backoffice/recycle-bin';
import { CONTENTLOCK_IS_LOCKED_ALLOWED_CONDITION_ALIAS } from '../conditions/ContentLocked.Allowed.Condition';

export const manifests: Array<UmbExtensionManifest> = [
    {
        type: 'workspaceAction',
        kind: 'default',
        overwrites: 'Umb.WorkspaceAction.Document.PreviewOnly', // Alias of thing you want to overwrite
        alias: 'contentlock.workspaceaction.previewonly',
        name: '[Content Lock] Preview Only Workspace Action',
        api: () => import('./PreviewOnly.WorkspaceAction'),
        weight: 70,
        meta: {
            look: 'default',
            color: 'default',
            label: '#general_preview' // Update the text of the button LABEL from '#buttons_saveAndPublish' to '#general_preview'
        },
        conditions: [
            {
				alias: 'Umb.Condition.WorkspaceAlias',
				match: 'Umb.Workspace.Document',
			},
            {
				alias: UMB_ENTITY_IS_NOT_TRASHED_CONDITION_ALIAS,
			},
            {
                alias: CONTENTLOCK_IS_LOCKED_ALLOWED_CONDITION_ALIAS
            }
        ]
    }
];
