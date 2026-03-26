// Docs for Auth with Playwright
// https://playwright.dev/docs/auth
// https://playwright.dev/docs/auth#multiple-signed-in-roles
// https://playwright.dev/docs/auth#testing-multiple-roles-together

import * as path from "path";
import { test as setup } from "../code/base";
import { ConstantHelper } from '@umbraco/playwright-testhelpers';

const STORAGE_STATE = path.join(__dirname, '../playwright/.auth/restricted-user.json');

// The restricted user is created by ContentLock.E2E AddRestrictedTestUser migration.
// This user is in the Editors group only — they do NOT have the ContentLock.Unlocker
// granular permission, so they cannot unlock content locked by other users.
setup('authenticate as restricted user', async ({page, umbracoUi}) => {

  await page.goto("/umbraco");
  await umbracoUi.login.enterEmail("restricted@hackmakedo.com");
  await umbracoUi.login.enterPassword("password1234");
  await umbracoUi.login.clickLoginButton();
  // Wait for the SPA to settle after login, then navigate to content.
  // checkSections=false — restricted user only has Content + Media sections,
  // so the default all-sections check (7 tabs) would always fail.
  await page.waitForLoadState('networkidle');
  await umbracoUi.login.goToSection(ConstantHelper.sections.content, false);
  await page.context().storageState({path: STORAGE_STATE});
});
