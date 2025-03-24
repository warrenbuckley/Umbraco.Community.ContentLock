import { UMB_ENTITY_IS_NOT_TRASHED_CONDITION_ALIAS } from '@umbraco-cms/backoffice/recycle-bin';
import { UMB_DOCUMENT_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/document';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';
import { CONTENTLOCK_SHOW_PREVIEW_CONDITION_ALIAS } from '../conditions/ShowPreview.Condition';

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
				alias: UMB_WORKSPACE_CONDITION_ALIAS,
				match: UMB_DOCUMENT_WORKSPACE_ALIAS,
			},
            {
				alias: UMB_ENTITY_IS_NOT_TRASHED_CONDITION_ALIAS,
			},
            {
                alias: CONTENTLOCK_SHOW_PREVIEW_CONDITION_ALIAS // Node is locked AND node is NOT locked by you
            }
        ]
    }
];
