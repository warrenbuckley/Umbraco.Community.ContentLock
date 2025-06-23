import {Page, Locator } from "@playwright/test";

export class ContentLockUiHelper  {

    dashboardTab: Locator;
    dashboardUnlockBtn: Locator;
    dashboardNoLocksMessage: Locator;

    constructor(page: Page) {
        
        this.dashboardTab = page.getByRole('tab', { name: 'Content Lock' });
        this.dashboardUnlockBtn = page.getByTestId('contentlock:dashboard:unlock');
        this.dashboardNoLocksMessage = page.getByTestId('contentlock:dashboard:nolocks');
    }
}