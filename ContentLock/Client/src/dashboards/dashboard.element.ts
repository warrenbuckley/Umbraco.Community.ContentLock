import { LitElement, css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT, UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { UmbTableConfig, UmbTableDeselectedEvent, UmbTableElement, UmbTableItem, UmbTableOrderedEvent, UmbTableSelectedEvent } from "@umbraco-cms/backoffice/components";
import { UmbTableColumnWithSort } from "../interfaces/UmbTableColumnWithSort";
import { ContentLockService } from "../api";

import '../components/table/table.pagelink.element';
import { ProblemDetailResponse } from "../interfaces/ProblemDetailResponse";
import { CONTENTLOCK_SIGNALR_CONTEXT } from "../globalContexts/contentlock.signalr.context";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";

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

    this.consumeContext(CONTENTLOCK_SIGNALR_CONTEXT, (lockCtx) => {
      // Observe when the values change from the Global Context that is communicating with SignalR
      this.observe(observeMultiple([lockCtx.contentLocks, lockCtx.totalContentLocks]), ([contentLocks, totalContentLocks]) => {
        console.log('Got the locks from signalr context', contentLocks);
        console.log('Got the total locks from signalr context', totalContentLocks);

        const locks = contentLocks;

        // Assign the items from SignalR response to the table items
        this._tableItems = locks.map(lockItem => ({
          icon: 'icon-lock',
          id: lockItem.key,
          data: [
            { columnAlias: 'key', value: lockItem.key },
            { columnAlias: 'pageName', value: lockItem.nodeName },
            { columnAlias: 'contentType', value: lockItem.contentType },
            { columnAlias: 'checkedOutBy', value: lockItem.checkedOutBy },
            { columnAlias: 'checkedOutAt', value: new Date(lockItem.lockedAtDate).toLocaleString() },
            { columnAlias: 'lastEdited', value: new Date(lockItem.lastEdited).toLocaleString() }
          ]
        }));

        this._totalLockedPages = totalContentLocks;

        this._isLoading = false;
      });
    });
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
      name: this.localize.term('contentLockDashboard_pageNameHeader'),
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
      name: this.localize.term('contentLockDashboard_contentTypeHeader'),
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
      name: this.localize.term('contentLockDashboard_checkedOutByHeader'),
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
      name: this.localize.term('contentLockDashboard_checkedOutAtHeader'),
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
      name: this.localize.term('contentLockDashboard_lastEditedHeader'),
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
  private _tableItems : Array<UmbTableItem> = [];

  async #bulkUnlock() {
    // Get the selection currently set
    const { error } = await ContentLockService.bulkUnlock({ body: this._selectedItems });
    if (error) {
      const errorResponse = error as ProblemDetailResponse;
      this._notificationCtx?.peek('danger', {
        data: {
          headline: errorResponse.title,
          message: errorResponse.detail
        }
      });

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

    // The table will reload - due to SignalR letting us know when a lock is removed
    // No need to explicitly call anything
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
          <uui-button .label=${this.localize.term('contentLockDashboard_unlockAction')} look="primary" color="default" disabled>
            <uui-icon name="icon-lock"></uui-icon>
          </uui-button>
        </uui-button-group>
        
        <div class="grid">
          <div class="container">
            <uui-box class="loading-table">
              <uui-loader></uui-loader>
            </uui-box>
          </div>
          <div class="container">
            <uui-box class="entries">
              <span slot="headline">
                <uui-icon name="icon-combination-lock"></uui-icon> 
                <umb-localize key="contentLockDashboard_pagesCheckedOutTitle"></umb-localize>
              </span>
              <uui-loader></uui-loader>
            </uui-box>
          </div>
        </div>
      `;
    }

    return html`
      <uui-button-group>
        <uui-button .label=${this.localize.term('contentLockDashboard_unlockAction')} look="primary" color="default" @click=${this.#bulkUnlock} ?disabled=${this.#isUnlockDisabled()}>
          <uui-icon name="icon-lock"></uui-icon>
        </uui-button>
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
            <span slot="headline">
              <uui-icon name="icon-combination-lock"></uui-icon> 
              <umb-localize key="contentLockDashboard_pagesCheckedOutTitle"></umb-localize>
            </span>
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
