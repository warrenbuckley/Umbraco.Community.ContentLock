// Docs for Auth with Playwright§
// https://playwright.dev/docs/auth
// https://playwright.dev/docs/auth#multiple-signed-in-roles
// https://playwright.dev/docs/auth#testing-multiple-roles-together

import * as path from "path";
import dotenv from 'dotenv';
import { test as setup } from '@playwright/test';
import { ConstantHelper, UiHelpers } from '@umbraco/playwright-testhelpers';
import { MyUiHelpers } from "../code/UiHelpers";

// Need to load the values from the .env file
// As rhe Umbraco npm package depends on using a .env with set variables
// So we can login and store the state of the login and persisted to a file
dotenv.config();

const STORAGE_STATE = path.join(__dirname, '../playwright/.auth/user.json');


setup('authenticate', async ({page}) => {
  // MyUiHelper extends Umbraco's UiHelpers
  const umbracoUi = new MyUiHelpers(page);

  await umbracoUi.goToMyBackOffice();
  await umbracoUi.login.enterEmail(process.env.UMBRACO_USER_LOGIN ?? "admin@admin.com");
  await umbracoUi.login.enterPassword(process.env.UMBRACO_USER_PASSWORD ?? "password");
  await umbracoUi.login.clickLoginButton();
  await umbracoUi.login.goToSection(ConstantHelper.sections.settings);
  await umbracoUi.page.context().storageState({path: STORAGE_STATE});
});
