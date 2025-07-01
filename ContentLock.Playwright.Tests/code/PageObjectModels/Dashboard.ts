import { Locator, Page } from "@playwright/test";
import { ConstantHelper, UiHelpers } from "@umbraco/playwright-testhelpers";

export class Dashboard {
    #page: Page;
    #umbracoUi: UiHelpers;

    dashboardTab: Locator;
    dashboardUnlockBtn: Locator;
    dashboardNoLocksMessage: Locator;
    dashboardNumberOfLocks: Locator;

    constructor(page: Page, umbracoUi: UiHelpers) {
        this.#page = page;
        this.#umbracoUi = umbracoUi;

        this.dashboardTab = page.getByRole('tab', { name: 'Content Lock' });
        this.dashboardUnlockBtn = page.getByTestId('contentlock:dashboard:unlock');
        this.dashboardNoLocksMessage = page.getByTestId('contentlock:dashboard:nolocks');
        this.dashboardNumberOfLocks = page.getByTestId('contentlock:dashboard:numberoflocks');
    }

    async goto () {
        // Navigate to the content section
        await this.#umbracoUi.content.goToSection(ConstantHelper.sections.content);

        // Click the dashboard tab
        await this.dashboardTab.click();
    }
}