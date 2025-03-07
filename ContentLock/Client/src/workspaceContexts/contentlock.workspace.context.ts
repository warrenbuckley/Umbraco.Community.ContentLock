import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { type UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentWorkspaceContext } from '@umbraco-cms/backoffice/document';
import { UmbBooleanState, UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import { ContentLockService, ContentLockStatus } from '../api';
import { UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { DomNodeUtils } from '../utils/dom.nodes';
import { LockedContentDialogElement } from '../components/dialog/locked-content-dialog';
import '../components/dialog/locked-content-dialog';

export class ContentLockWorkspaceContext extends UmbControllerBase {

    private _docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    private _unique: UmbEntityUnique | undefined;
    private _dialogElement: LockedContentDialogElement | null = null;
  
    #isLocked = new UmbBooleanState(false);
    isLocked = this.#isLocked.asObservable();

    #isLockedBySelf = new UmbBooleanState(false);
    isLockedBySelf = this.#isLockedBySelf.asObservable();

    #lockedByName = new UmbStringState('');
    lockedByName = this.#lockedByName.asObservable();

	constructor(host: UmbControllerHost) {
		super(host, CONTENTLOCK_WORKSPACE_CONTEXT.toString());
		this.provideContext(CONTENTLOCK_WORKSPACE_CONTEXT, this);

        this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (docWorkspaceCtx) => {
            this._docWorkspaceCtx = docWorkspaceCtx;
            this._docWorkspaceCtx?.unique.subscribe((unique) => {
                this._unique = unique;

                if(!this._unique){
                    return;
                }

                // Call API now we have assigned the unique
                this.checkContentLockState();

                // Add an event listener into the window for the navigation success router event
                // Why? - well the findInShadowRoot() util method won't find the DOM elements until all the items been loaded in from router slots
                window.addEventListener('navigationsuccess', this._navigationSuccessHandler);
            });
        });

        // Create and append the dialog element to the body
        // This feels a bit hacky to use a native HTML5 dialog and not modalManager context
        // As the modal manager closes the modal immediately after opening it when we navigate to the page
        // This is due to closeNoneRoutableModals AFAIK from Umbraco modalManagerCtx
        console.log('Add dialog to body for us to open');

        // Create and append the dialog element to the body
        this._dialogElement = document.createElement('locked-content-dialog') as LockedContentDialogElement;
        document.body.appendChild(this._dialogElement);
	}

    override destroy() {
        super.destroy();

        console.log('DESTROY THE DIALOG');

        if (this._dialogElement) {
            document.body.removeChild(this._dialogElement);
            this._dialogElement = null;
        }

        window.removeEventListener('navigationsuccess', this._navigationSuccessHandler);
    }

    private _navigationSuccessHandler = () => {
        // Check to see if we have our NODE in the DOM
        // As it fires as we change from tab to tab in the document workspace
        // And dont want to duplicate the notice over and over
        const tryFindNotice = DomNodeUtils.findInShadowRoot(document, '#locked-by-notice');
        if(!tryFindNotice){
            const tryFindInsertBefore = DomNodeUtils.findInShadowRoot(document, 'umb-content-workspace-view-edit-tab');
            if(tryFindInsertBefore){
                tryFindInsertBefore.insertAdjacentHTML('beforebegin', `<div id="locked-by-notice" style="margin-bottom: var(--uui-size-4); padding: var(--uui-size-5); background: var(--uui-color-current);">This node is locked by ${this.#lockedByName.getValue()}</div>`)
            }
        }
    }

    private async _getStatus(key: string) : Promise<ContentLockStatus | undefined> {

        const { data, error } = await ContentLockService.status({path:{key:key}});
        if (error){
            console.error(error);
            return undefined;
        }
        
        return data;
    }

    async checkContentLockState() {
        // Check if the current document is locked and its not locked by self
        await this._getStatus(this._unique!).then(async (status) => {

            // Set the observable bool that we consume as part of condition
            this.setIsLocked(status?.isLocked ?? false);
            this.setIsLockedBySelf(status?.lockedBySelf ?? false);
            this.setLockedByName(status?.lockedByName ?? '');

            if(status?.isLocked && status.lockedBySelf === false){
                
                try {
                    // Display the dialog if the document is locked by someone else
                    const dialog = this._dialogElement;
                    if(dialog){
                        dialog.lockedBy = status.lockedByName!;
                        dialog.openDialog();
                    }
                } catch (error) {
                    console.error('Error opening dialog:', error);
                }
            }
        });
    }
    
	getIsLocked() {
		return this.#isLocked.getValue();
	}
	
	setIsLocked(isLocked: boolean) {
		this.#isLocked.setValue(isLocked);
	}

    getIsLockedBySelf() {
		return this.#isLockedBySelf.getValue();
	}
	
	setIsLockedBySelf(isLockedBySelf: boolean) {
		this.#isLockedBySelf.setValue(isLockedBySelf);
	}

    getLockedByName() {
		return this.#lockedByName.getValue();
	}
	
	setLockedByName(lockedBy: string) {
		this.#lockedByName.setValue(lockedBy);
	}
}

// Declare a api export, so Extension Registry can initialize this class:
export const api = ContentLockWorkspaceContext;

// Declare a Context Token that other elements can use to request the WorkspaceContextCounter:
export const CONTENTLOCK_WORKSPACE_CONTEXT = new UmbContextToken<ContentLockWorkspaceContext>('UmbWorkspaceContext', 'contentlock.workspacecontext');