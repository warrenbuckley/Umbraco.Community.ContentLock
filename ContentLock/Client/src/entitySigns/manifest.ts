import { UMB_DOCUMENT_ENTITY_TYPE } from "@umbraco-cms/backoffice/document";

export const manifests: Array<UmbExtensionManifest> = [
	{
        name: '[Content Lock] Is Locked Document Entity Sign',
        alias: 'ContentLock.EntitySign.Document.IsLocked',
		type: 'entitySign',
		kind: 'icon',
		forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
		forEntityFlags: ['Umb.ContentLock.Locked'],
        weight: 2000,
		meta: { 
            iconName: 'icon-lock',
			label: 'Content is Locked',
			iconColorAlias: 'red',
        },
	},
];
