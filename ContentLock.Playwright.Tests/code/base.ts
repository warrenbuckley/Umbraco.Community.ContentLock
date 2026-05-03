import { test as base } from '@umbraco-cms/acceptance-test-helpers';
import { Dashboard } from './PageObjectModels/Dashboard';
import { Api } from './api';

export type TestOptions = {
    dashboard: Dashboard;
    umbracoApi: Api;
};

// Extend the base test with the Dashboard page object
// And our updated API class which has extended the one from Umbraco
export const test = base.extend<TestOptions>({
    dashboard: async ({ page, umbracoUi }, use) => {
        const dashboard = new Dashboard(page, umbracoUi);
        await use(dashboard);
    },
    umbracoApi: async ({ page }, use) => {
       const newUmbApi = new Api(page);
       await use(newUmbApi);
    }
});

