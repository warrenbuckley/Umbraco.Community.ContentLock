//import { test as base } from "@playwright/test";
import { test as base } from "@umbraco/playwright-testhelpers";
import { Dashboard } from "./PageObjectModels/Dashboard";

//export { expect } from "@playwright/test";

export type TestOptions = {
    dashboard: Dashboard;
};

// Extend the base test with the Dashboard page object
export const test = base.extend<TestOptions>({
    dashboard: async ({ page, umbracoUi }, use) => {
        const dashboard = new Dashboard(page, umbracoUi);
        await use(dashboard);
    },
});

