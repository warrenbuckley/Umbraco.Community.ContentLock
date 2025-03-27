import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { type UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT, UmbDocumentVariantModel, UmbDocumentWorkspaceContext } from '@umbraco-cms/backoffice/document';
import { observeMultiple, UmbBooleanState, UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import { UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { UmbVariantId } from '@umbraco-cms/backoffice/variant';
import ContentLockSignalrContext, { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';

export class ContentLockWorkspaceContext extends UmbControllerBase {

    #docWorkspaceCtx?: UmbDocumentWorkspaceContext;
    #unique: UmbEntityUnique | undefined;
    #variants: UmbDocumentVariantModel[] = [];
  
    #isLocked = new UmbBooleanState(false);
    isLocked = this.#isLocked.asObservable();

    #isLockedBySelf = new UmbBooleanState(false);
    isLockedBySelf = this.#isLockedBySelf.asObservable();

    #lockedByName = new UmbStringState('');
    lockedByName = this.#lockedByName.asObservable();

    #signalRContext?: ContentLockSignalrContext;

    #currentUserKey?: string;


	constructor(host: UmbControllerHost) {
		super(host, CONTENTLOCK_WORKSPACE_CONTEXT.toString());
		this.provideContext(CONTENTLOCK_WORKSPACE_CONTEXT, this);

        this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (signalRContext) => {
           this.#signalRContext = signalRContext;
        });

        this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserCtx) => {
            this.observe(currentUserCtx.unique, (currentUserKey) => {
                this.#currentUserKey = currentUserKey;
            });
        });

        this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (docWorkspaceCtx) => {
            this.#docWorkspaceCtx = docWorkspaceCtx;

            this.#docWorkspaceCtx.observe(observeMultiple([this.#docWorkspaceCtx?.unique, this.#docWorkspaceCtx?.variants]), ([unique, variants]) => {
                this.#unique = unique;
                this.#variants = variants;

                // Call API now we have assigned the unique
                this.checkContentLockState();
            });
        });
	}

    public async checkContentLockState() {
        if(!this.#unique) return;
        if(!this.#currentUserKey) return;

        if (this.#signalRContext) {
            
            // Observe the 3 states from the SignalR context
            // isLocked: boolean - Is the item locked by anyone
            // isLockedBySelf: boolean - Is the item locked by the current user
            // lockInfo: object - Contains the lock info, including who locked it
            this.observe(observeMultiple([
                this.#signalRContext.isNodeLocked(this.#unique.toString()),
                this.#signalRContext.isNodeLockedByMe(this.#unique.toString(), this.#currentUserKey),
                this.#signalRContext.getLock(this.#unique.toString())
            ]), ([isLocked, isLockedBySelf, lockInfo]) => {

                console.log('isLocked:', isLocked, 'isLockedBySelf:', isLockedBySelf, 'lockInfo:', lockInfo);

                // Set the observables
                this.setIsLocked(isLocked);
                this.setIsLockedBySelf(isLockedBySelf);
                if (lockInfo) {
                    this.setLockedByName(lockInfo.checkedOutBy);
                }

                if(isLocked && isLockedBySelf === false){
                    // Page is locked by someone else - set the readonly state
        
                    // Set the read only state of the document for ALL culture & segment variant combinations
                    // Even documents without a variant will have a default variant with the culture and segment set to null
                    this.#variants.forEach(async variant => {
                        await this.#docWorkspaceCtx?.readOnlyState.addState({
                            unique: `${this.#unique!.toString()}-${variant.culture}`,
                            variantId: new UmbVariantId(variant.culture, variant.segment),
                            message: `This page is locked by ${lockInfo?.checkedOutBy}`
                        });
                    });
                }
                else {
                    // Page is not locked or its locked by self - remove the readonly state
                    this.#variants.forEach(async variant => {
                        await this.#docWorkspaceCtx?.readOnlyState.removeState(`${this.#unique!.toString()}-${variant.culture}`);
                    });
                }
            });
        }
    }
    
	public getIsLocked() {
		return this.#isLocked.getValue();
	}
	
	public setIsLocked(isLocked: boolean) {
		this.#isLocked.setValue(isLocked);
	}

    public getIsLockedBySelf() {
		return this.#isLockedBySelf.getValue();
	}
	
	public setIsLockedBySelf(isLockedBySelf: boolean) {
		this.#isLockedBySelf.setValue(isLockedBySelf);
	}

    public getLockedByName() {
		return this.#lockedByName.getValue();
	}
	
	public setLockedByName(lockedBy: string) {
		this.#lockedByName.setValue(lockedBy);
	}
}

// Declare a api export, so Extension Registry can initialize this class:
export const api = ContentLockWorkspaceContext;

// Declare a Context Token that other elements can use to request the WorkspaceContextCounter:
export const CONTENTLOCK_WORKSPACE_CONTEXT = new UmbContextToken<ContentLockWorkspaceContext>('UmbWorkspaceContext', 'contentlock.workspacecontext');