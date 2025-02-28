import type { UmbTableColumn, UmbTableColumnLayoutElement, UmbTableItem } from '@umbraco-cms/backoffice/components';
import { customElement, html, property } from '@umbraco-cms/backoffice/external/lit';
import { UUIButtonElement } from '@umbraco-cms/backoffice/external/uui';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';

@customElement('contentlock-table-pagelink')
export class ContentLockTablePageLinkElement extends UmbLitElement implements UmbTableColumnLayoutElement {
    
    // The column info from the table is passed to us
    column!: UmbTableColumn;

    // The current item/row of data, icon, key is passed to us from the table
    item!: UmbTableItem;

    @property({ attribute: false })
    value!: string;

    override render() {
        return html`
            <uui-button
                compact
                href="/umbraco/section/content/workspace/document/edit/${this.item.id}"
                label=${this.value}
                @click=${this.#onClick}></uui-button>
        `;
    }

	#onClick(event: Event & { target: UUIButtonElement }) {
		event.preventDefault();
		event.stopPropagation();
		window.history.pushState(null, '', event.target.href);
	}
}

export default ContentLockTablePageLinkElement;

declare global {
	interface HTMLElementTagNameMap {
		'contentlock-table-pagelink': ContentLockTablePageLinkElement;
	}
}
