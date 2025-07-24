// Docs for Auth with Playwright
// https://playwright.dev/docs/auth
// https://playwright.dev/docs/auth#multiple-signed-in-roles
// https://playwright.dev/docs/auth#testing-multiple-roles-together

import * as path from "path";
import { test as setup } from "../code/base";
import { ConstantHelper } from '@umbraco/playwright-testhelpers';

const STORAGE_STATE = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({page, umbracoUi}) => {

  await page.goto("/umbraco");
  await umbracoUi.login.enterEmail("warren@hackmakedo.com");
  await umbracoUi.login.enterPassword("password1234");
  await umbracoUi.login.clickLoginButton();
  await umbracoUi.login.goToSection(ConstantHelper.sections.settings);
  await page.context().storageState({path: STORAGE_STATE});
});
