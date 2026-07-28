import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UmbPreviewRepository } from '@umbraco-cms/backoffice/preview';
import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';

export default class ContentLockPreviewOnlyWorkspaceAction extends UmbWorkspaceActionBase {

    async execute() {
        try {
            // Get the workspace context & the current document unique id
            const workspaceContext = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
            const unique = workspaceContext?.getUnique();

            if (!unique) {
                return;
            }

            // Requesting the preview URL also does the cookie handshake to enter preview mode
            const previewUrlData = await new UmbPreviewRepository(this).getPreviewUrl(unique, 'umbDocumentUrlProvider');

            if (previewUrlData.url) {
                // Open the browser tab & focus to it
                const preview = window.open(previewUrlData.url, 'umbpreview');
                preview?.focus();
            }
        }
        catch (error) {
            console.error('Failed to open preview', error);
        }
    }
}