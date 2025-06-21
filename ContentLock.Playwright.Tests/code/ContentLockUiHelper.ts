import {Page, Locator } from "@playwright/test";

export class ContentLockUiHelper  {

    /**
     * The dasboard tab for content lock when we are in the content section
     * 
     */
    dashboardTab: Locator;

    constructor(page: Page) {
        
        this.dashboardTab = page.getByRole('tab', { name: 'Content Lock' });

        // this.redirectManagementTab = page.getByRole('tab', {name: 'Redirect URL Management'});
        // this.enableURLTrackerBtn = page.getByLabel('Enable URL tracker');
        // this.disableURLTrackerBtn = page.getByLabel('Disable URL tracker');
        // this.originalUrlTxt = page.getByLabel('Original URL');
        // this.searchBtn = page.getByLabel('Search', { exact: true });
        // this.firstDeleteButton = page.locator('uui-button[label="Delete"]').first().locator('svg');
        // this.redirectManagementRows = page.locator('umb-dashboard-redirect-management uui-table-row');
    }
}