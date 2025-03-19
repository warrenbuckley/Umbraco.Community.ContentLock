import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { type UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentVariantModel, UmbDocumentWorkspaceContext } from '@umbraco-cms/backoffice/document';
import { observeMultiple, UmbBooleanState, UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import { ContentLockService, ContentLockStatus } from '../api';
import { UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { UmbVariantId } from '@umbraco-cms/backoffice/variant';

export class ContentLockWorkspaceContext extends UmbControllerBase {

    private _docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    private _unique: UmbEntityUnique | undefined;
    private _variants: UmbDocumentVariantModel[] = [];
  
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

            this._docWorkspaceCtx.observe(observeMultiple([this._docWorkspaceCtx?.unique, this._docWorkspaceCtx?.variants]), ([unique, variants]) => {
                this._unique = unique;
                this._variants = variants;

                // Call API now we have assigned the unique
                this.checkContentLockState();
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

    async checkContentLockState() {
        // Check if the current document is locked and its not locked by self
        await this._getStatus(this._unique!).then(async (status) => {

            // Set the observable bools
            // So conditions can react and the Workspace Footer App 
            this.setIsLocked(status?.isLocked ?? false);
            this.setIsLockedBySelf(status?.lockedBySelf ?? false);
            this.setLockedByName(status?.lockedByName ?? '');

            if(status?.isLocked && status.lockedBySelf === false){
                // Page is locked by someone else - set the readonly state

                // Set the read only state of the document for ALL culture & segment variant combinations
                // Even documents without a variant will have a default variant with the culture and segment set to null
                this._variants.forEach(async variant => {
                    await this._docWorkspaceCtx?.readOnlyState.addState({
                        unique: `${this._unique!.toString()}-${variant.culture}`,
                        variantId: new UmbVariantId(variant.culture, variant.segment),
                        message: `This page is locked by ${status?.lockedByName}`
                    });
                });
            }
            else {
                // Page is not locked or its locked by self - remove the readonly state
                this._variants.forEach(async variant => {
                    await this._docWorkspaceCtx?.readOnlyState.removeState(`${this._unique!.toString()}-${variant.culture}`);
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