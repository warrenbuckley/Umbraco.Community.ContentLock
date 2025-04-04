import { LitElement, css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";

@customElement('number-of-users-workspacefooterapp')
export class NumUsersWorkspaceFooterAppElement extends UmbElementMixin(LitElement) {

    constructor() {
        super();

    }


    render() {

        return html `
            <uui-icon name="icon-eye"></uui-icon> 4 other people viewing
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
            }

            uui-icon {
                vertical-align: text-top;
                padding-right: var(--uui-size-space-1);
            }
        `,
    ];
}

export default NumUsersWorkspaceFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'number-of-users-workspacefooterapp': NumUsersWorkspaceFooterAppElement;
    }
}