import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentPreviewRepository } from '@umbraco-cms/backoffice/document';
import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';

export default class ContentLockPreviewOnlyWorkspaceAction extends UmbWorkspaceActionBase {

    async execute() {
        try {
            // Get the workspace context & the current document unique id
            const workspaceContext = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
            const unique = workspaceContext.getUnique();

            // This does the cookie handhake etc AFAIK
            await new UmbDocumentPreviewRepository(this).enter();

            // Open the browser tab & focus to it
            const preview = window.open(`preview?id=${unique}`, 'umbpreview');
            preview?.focus();
        }
        catch (error) {
            console.error('Failed to open preview', error);
        }
    }
}