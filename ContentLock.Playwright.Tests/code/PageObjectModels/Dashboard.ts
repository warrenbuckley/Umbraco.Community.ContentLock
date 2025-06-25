import { Locator, Page } from "@playwright/test";

export class Dashboard {
    #page: Page;

    dashboardTab: Locator;
    dashboardUnlockBtn: Locator;
    dashboardNoLocksMessage: Locator;
    dashboardNumberOfLocks: Locator;

    constructor(page: Page) {
        this.#page = page;

        this.dashboardTab = page.getByRole('tab', { name: 'Content Lock' });
        this.dashboardUnlockBtn = page.getByTestId('contentlock:dashboard:unlock');
        this.dashboardNoLocksMessage = page.getByTestId('contentlock:dashboard:nolocks');
        this.dashboardNumberOfLocks = page.getByTestId('contentlock:dashboard:numberoflocks');
    }

    
}