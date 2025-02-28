import type { UmbTableColumn } from '@umbraco-cms/backoffice/components';

/* Extending UmbTableColumn from Umbraco to add a new property */
export interface UmbTableColumnWithSort extends UmbTableColumn {
    sortFunc?: Function;
}