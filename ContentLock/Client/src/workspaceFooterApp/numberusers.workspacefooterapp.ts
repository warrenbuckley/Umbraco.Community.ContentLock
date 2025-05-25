import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { css, customElement, html, LitElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { CONTENTLOCK_VIEWINGUSERS_MODAL } from "../modals/viewingUsers/viewingusers.modal.token";

@customElement('numberusers-workspacefooterapp')
export class NumberUsersWorkspaceFooterAppElement extends UmbElementMixin(LitElement) {

    #modalManagerCtx?: UmbModalManagerContext;;

    constructor() {
        super();

        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT,(modalManagerCtx)=> {
            this.#modalManagerCtx = modalManagerCtx;
        });
    }

    #handleClick() {
        // Handle click event, e.g., navigate to a user list or show a modal
        this.#modalManagerCtx?.open(this, CONTENTLOCK_VIEWINGUSERS_MODAL, {
            value: {
                header: 'Who\'s here?',
                subHeader: 'Users viewing this node',
            }
        });
    }

    @state()
    _numberOfUsers = 0;

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