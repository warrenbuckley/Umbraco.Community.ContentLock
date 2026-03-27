import { css, customElement, html, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { ManifestEntitySign } from '@umbraco-cms/backoffice/entity-sign';

@customElement('contentlock-entitysign')
export class ContentLockEntitySignElement extends UmbLitElement {

    @property({ type: Object, attribute: false })
    manifest?: ManifestEntitySign;

    override render() {
        return html`
            <span class="anchor">
                <uui-badge color="danger" look="primary"></uui-badge>
            </span>
        `;
    }

    static override styles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .anchor {
            position: relative;
            display: inline-block;
            width: 12px;
            height: 12px;
        }
    `;
}

export default ContentLockEntitySignElement;

declare global {
    interface HTMLElementTagNameMap {
        'contentlock-entitysign': ContentLockEntitySignElement;
    }
}
