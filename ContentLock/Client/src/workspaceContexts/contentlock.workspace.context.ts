import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { type UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentWorkspaceContext } from '@umbraco-cms/backoffice/document';
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from '@umbraco-cms/backoffice/modal';
import { UmbBooleanState, UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import { ContentLockService, ContentLockStatus } from '../api';
import { LOCKED_CONTENT_MODAL } from '../modals/locked.modal.token';
import { UmbEntityUnique } from '@umbraco-cms/backoffice/entity';

export class ContentLockWorkspaceContext extends UmbControllerBase {

    private _modalManager?: UmbModalManagerContext;
    private _docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    private _unique: UmbEntityUnique | undefined;
  
    #isLocked = new UmbBooleanState(false);
    isLocked = this.#isLocked.asObservable();

    #isLockedBySelf = new UmbBooleanState(false);
    isLockedBySelf = this.#isLockedBySelf.asObservable();

    #lockedByName = new UmbStringState('');
    lockedByName = this.#lockedByName.asObservable();

	constructor(host: UmbControllerHost) {
		super(host, CONTENTLOCK_WORKSPACE_CONTEXT.toString());
		this.provideContext(CONTENTLOCK_WORKSPACE_CONTEXT, this);

        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (modalManager) => {
            this._modalManager = modalManager;
        });

        this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (docWorkspaceCtx) => {
            this._docWorkspaceCtx = docWorkspaceCtx;
            this._docWorkspaceCtx?.unique.subscribe((unique) => {
                this._unique = unique;

                if(!this._unique){
                    return;
                }

                // Call API now we have assigned the unique
                this.checkContentGuardState();
            });
        });
	}

    private async _getStatus(key: string) : Promise<ContentLockStatus | undefined> {

        const { data, error } = await ContentLockService.status({path:{key:key}});
        if (error){
            console.error(error);
            return undefined;
        }
        
        return data;
    }

    async checkContentGuardState() {

        // Check if the current document is locked and its not locked by self
        await this._getStatus(this._unique!).then(async (status) => {

            // Set the observable bool that we consume as part of condition
            this.setIsLocked(status?.isLocked ?? false);
            this.setIsLockedBySelf(status?.lockedBySelf ?? false);
            this.setLockedByName(status?.lockedByName ?? '');

            if(status?.isLocked && status.lockedBySelf === false){
                // Display a modal if the document is locked by someone else
                this._modalManager?.open(this, LOCKED_CONTENT_MODAL, {
                    data: {
                        lockedBy: status.lockedByName!
                    }
                });
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