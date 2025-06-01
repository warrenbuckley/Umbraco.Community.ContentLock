import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { css, customElement, html, LitElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { CONTENTLOCK_USERS_MODAL } from "../modals/users.modal.token";
import { UMB_CONTENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/content";

@customElement('numberusers-workspacefooterapp')
export class NumberUsersWorkspaceFooterAppElement extends UmbElementMixin(LitElement) {

    #modalManagerCtx?: UmbModalManagerContext;

    @state()
    _unique?: string;

    constructor() {
        super();

        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT,(modalManagerCtx)=> {
            this.#modalManagerCtx = modalManagerCtx;
        });

        this.consumeContext(UMB_CONTENT_WORKSPACE_CONTEXT, (contentWorkspaceCtx) => {
            this.observe(contentWorkspaceCtx.unique, (unique) => {
                this._unique = unique?.toString();
            });
        });
    }

    #handleClick() {
        this.#modalManagerCtx?.open(this, CONTENTLOCK_USERS_MODAL, {
            value: {
                header: 'Who\'s here?',
                subHeader: 'Users viewing this node',
                unique: this._unique
            }
        });
    }

    @state()
    _numberOfUsers = 0;

    // TODO: Custom translation key function to get 1 User or 2 Users (singular/plural)

    render() {
        return html `
            <uui-tag @click=${this.#handleClick} color="default" look="secondary">
                <uui-icon name="icon-eye"></uui-icon> ${this._numberOfUsers} Users
            </uui-tag>
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding-left: var(--uui-size-layout-1);
            }

            uui-tag {
                cursor: pointer;
            }
        `,
    ];
}

export default NumberUsersWorkspaceFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'numberusers-workspacefooterapp': NumberUsersWorkspaceFooterAppElement;
    }
}