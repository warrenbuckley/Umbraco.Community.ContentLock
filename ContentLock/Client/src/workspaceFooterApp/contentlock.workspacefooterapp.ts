import { LitElement, css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
//import '@umbraco-cms/backoffice/external/uui/uui-badge'; 

import "@umbraco-cms/backoffice/external/uui";

@customElement('contentlock-workspacefooterapp')
export class ContentLockWorkspaceVFooterAppElement extends UmbElementMixin(LitElement) {

    constructor() {
        super();
        console.log('hi from workspace footer app');
    }


    render() {
        return html`
            <div id="message">
                This Page is Locked by Warren
                <uui-badge color="danger" look="primary" attention>
                    <uui-icon name="icon-lock"></uui-icon>
                </uui-badge>
            </div>
            
        `;
    }

    static styles = [
        UmbTextStyles,
        css`
            :host {
                display: block;
                padding: var(--uui-size-layout-1);
            }

            uui-badge {
                z-index: 9999;
            }

            #message {
                border: 1px dashed var(--uui-color-danger);
                color: var(--uui-color-danger);
                padding:4px 14px 4px 10px;
                border-radius: 20px;
                font-size: 12px;
                position:relative;
            }
        `,
    ];
}

export default ContentLockWorkspaceVFooterAppElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-workspacefooterapp': ContentLockWorkspaceVFooterAppElement;
    }
}