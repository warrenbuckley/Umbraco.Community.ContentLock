import { LitElement, css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { UmbTableConfig, UmbTableDeselectedEvent, UmbTableElement, UmbTableItem, UmbTableOrderedEvent, UmbTableSelectedEvent } from "@umbraco-cms/backoffice/components";
import { UmbTableColumnWithSort } from "../interfaces/UmbTableColumnWithSort";
import { ContentLockService } from "../api";

import '../components/table/table.pagelink.element';

@customElement('contentlock-dashboard')
export class ContentLockDashboardElement extends UmbElementMixin(LitElement) {

  private _notificationCtx?: UmbNotificationContext;

  constructor() {
    super();

    // Set init page state to loading until we get response from API
    this._isLoading = true;

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationCtx) => {
      this._notificationCtx = notificationCtx;
    });

    // Get items from API
    this._getItems();
  }

  @state()
  private _totalLockedPages: number = 0;

  @state()
  private _isLoading: boolean;

  @state()
  private _tableConfig: UmbTableConfig = {
    allowSelection: true,
    hideIcon: false,
  };

  @state()
  private _tableColumns: Array<UmbTableColumnWithSort> = [
    {
      name: 'Page Name',
      alias: 'pageName',
      allowSorting: true,
      elementName: 'contentlock-table-pagelink', // This is a custom element that will be used to render the cell value in an uui-button
      sortFunc: (items: Array<UmbTableItem>, desc: boolean) => {
        const sortedItems = [...items].sort((a, b) => {
          const aValue = a.data.find(d => d.columnAlias === 'pageName')?.value || '';
          const bValue = b.data.find(d => d.columnAlias === 'pageName')?.value || '';

          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
        return sortedItems;
      },
    },
    {
      name: 'Content Type',
      alias: 'contentType',
      allowSorting: true,
      sortFunc: (items: Array<UmbTableItem>, desc: boolean) => {
        const sortedItems = [...items].sort((a, b) => {
          const aValue = a.data.find(d => d.columnAlias === 'contentType')?.value || '';
          const bValue = b.data.find(d => d.columnAlias === 'contentType')?.value || '';

          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
        return sortedItems;
      },
    },
    {
      name: 'Checked out by',
      alias: 'checkedOutBy',
      allowSorting: true,
      sortFunc: (items: Array<UmbTableItem>, desc: boolean) => {
        const sortedItems = [...items].sort((a, b) => {
          const aValue = a.data.find(d => d.columnAlias === 'checkedOutBy')?.value || '';
          const bValue = b.data.find(d => d.columnAlias === 'checkedOutBy')?.value || '';

          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
        return sortedItems;
      },
    },
    {
      name: 'Checked out at',
      alias: 'checkedOutAt',
      allowSorting: true,
      sortFunc: (items: Array<UmbTableItem>, desc: boolean) => {
        const sortedItems = [...items].sort((a, b) => {
          const aValue = a.data.find(d => d.columnAlias === 'checkedOutAt')?.value || '';
          const bValue = b.data.find(d => d.columnAlias === 'checkedOutAt')?.value || '';

          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
        return sortedItems;
      },
    },
    {
      name: 'Last Edited',
      alias: 'lastEdited',
      allowSorting: true,
      sortFunc: (items: Array<UmbTableItem>, desc: boolean) => {
        const sortedItems = [...items].sort((a, b) => {
          const aValue = a.data.find(d => d.columnAlias === 'lastEdited')?.value || '';
          const bValue = b.data.find(d => d.columnAlias === 'lastEdited')?.value || '';

          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
        return sortedItems;
      },
    }
  ];

  @state()
  private _selectedItems: Array<string> = [];

  #isUnlockDisabled(): boolean {
    return this._selectedItems.length === 0;
  }

  @state()
  private _tableItems: Array<UmbTableItem> = [];

  private async _getItems() {

    this._isLoading = true;

// TODO: error will come back as this shape of JSON
/*
{
  "type": "Error",
  "title": "Unauthorized",
  "status": 400,
  "detail": "Only the original user who locked this content can unlock it or a super user with the unlocking permission"
}
*/
const { data, error } = await ContentLockService.lockOverview();
if (error) {
  this._notificationCtx?.peek('danger', {
    data: {
      headline:'TODO: Get from error',
      message: 'Kaboom this is an error'
    }
  });

  this._isLoading = false;
  return;
}

    if (data) {
      const response = data;
      this._isLoading = false;

      // Assign total number of results to the entries box
      this._totalLockedPages = response?.totalResults || 0;

      // Assign the items to the table
      this._tableItems = response!.items.map(item => ({
        icon: 'icon-lock',
        id: item.key,
        data: [
          { columnAlias: 'key', value: item.key },
          { columnAlias: 'pageName', value: item.nodeName },
          { columnAlias: 'contentType', value: item.contentType },
          { columnAlias: 'checkedOutBy', value: item.checkedOutBy },
          { columnAlias: 'checkedOutAt', value: new Date(item.lockedAtDate).toLocaleString() },
          { columnAlias: 'lastEdited', value: new Date(item.lastEdited).toLocaleString() }
        ]
      }));
    }
  }

  async #bulkUnlock() {
    // Get the selection currently set
    const { error } = await ContentLockService.bulkUnlock({body: this._selectedItems});
    if (error) {
      // TODO: Display Error Notification
      alert(`err: ${error}`);
      console.error(error);
      return;
    }

    // Display notification
    this._notificationCtx?.peek('positive', {
      data: {
        headline: 'Content unlocked',
        message: 'The selected content has been unlocked successfully'
      }
    });

    // Reload the items from the server to update the table
    this._getItems();
  }

  #onSelected(event: UmbTableSelectedEvent) {
    event.stopPropagation();
    const table = event.target as UmbTableElement;
    const selection = table.selection;
    this._selectedItems = selection;
  }

  #onDeselected(event: UmbTableDeselectedEvent) {
    event.stopPropagation();
    const table = event.target as UmbTableElement;
    const selection = table.selection;
    this._selectedItems = selection;
  }

  #onOrdering(event: UmbTableOrderedEvent) {
    const table = event.target as UmbTableElement;

    const orderingColumn = table.orderingColumn;
    const orderingDesc = table.orderingDesc;

    // Get the column from the columns property array where it matches the orderingColumn
    const column = this._tableColumns.find((col) => col.alias === orderingColumn) as UmbTableColumnWithSort;

    if (column && column.sortFunc) {
      // Call the sort func set on the column
      // Pass along the table items and the ordering direction
      this._tableItems = column.sortFunc(this._tableItems, orderingDesc);
    }
  }

  render() {
    if (this._isLoading) {
      return html`
        <uui-button-group>
          <uui-button label="Unlock" look="primary" color="default" disabled><uui-icon name="icon-lock"></uui-icon> Unlock</uui-button>
        </uui-button-group>
        
        <div class="grid">
          <div class="container">
            <uui-box class="loading-table">
              <uui-loader></uui-loader>
            </uui-box>
          </div>
          <div class="container">
            <uui-box class="entries">
              <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Pages Checked Out</span>
              <uui-loader></uui-loader>
            </uui-box>
          </div>
        </div>
      `;
    }

    return html`
      <uui-button-group>
        <uui-button label="Unlock" look="primary" color="default" @click=${this.#bulkUnlock} ?disabled=${this.#isUnlockDisabled()}><uui-icon name="icon-lock"></uui-icon> Unlock</uui-button>
      </uui-button-group>
      
      <div class="grid">
        <div class="container">
          <uui-scroll-container>
              <umb-table 
                  .config=${this._tableConfig} 
                  .columns=${this._tableColumns} 
                  .items=${this._tableItems}
                  @selected="${this.#onSelected}"
                  @deselected="${this.#onDeselected}"
                  @ordered="${this.#onOrdering}"></umb-table>
          </uui-scroll-container>
        </div>
        <div class="container entries-col">
          <uui-box class="entries">
            <span slot="headline"><uui-icon name="icon-combination-lock"></uui-icon> Pages Checked Out</span>
            <h2>${this._totalLockedPages}</h2>
          </uui-box>
        </div>
      </div>
    `;
  }

  static styles = [
    UmbTextStyles,
    css`
      :host {
        padding: var(--uui-size-layout-1);
        display: block;
      }

      uui-button-group {
        margin-bottom: var(--uui-size-layout-1);
      }
        
      .loading-table {
        text-align: center;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .grid {
        display: grid;
        gap: var(--uui-size-layout-1);
        grid-template-columns: 1fr 350px;
      }

      .entries {
        text-align: center;
        background-color: var(--uui-color-current-emphasis);
      }

      h2 {
        color: var(--uui-palette-violet-blue);
        font-size: var(--uui-size-14);
      }

      uui-icon {
        vertical-align: top;
      }

      uui-scroll-container {
        height:calc(100vh - 235px);
      }

      /* Media query to hide the container on small screens */
      @media (max-width: 1600px) {
        .entries-col {
          display: none;
        }
        
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];
}

export default ContentLockDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    'contentlock-dashboard': ContentLockDashboardElement;
  }
}
