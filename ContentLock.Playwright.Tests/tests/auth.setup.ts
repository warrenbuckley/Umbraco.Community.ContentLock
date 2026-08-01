// Docs for Auth with Playwright
// https://playwright.dev/docs/auth
// https://playwright.dev/docs/auth#multiple-signed-in-roles
// https://playwright.dev/docs/auth#testing-multiple-roles-together

import * as path from "path";
import { test as setup } from "../code/base";
import { ConstantHelper } from '@umbraco-cms/acceptance-test-helpers';

const STORAGE_STATE = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({page, umbracoUi}) => {

  await page.goto("/umbraco");
  // Wait explicitly for the login form's username input to be visible.
  // On a fresh CI install the Lit SPA bundle can take several seconds to execute
  // and render the login form after the page loads.
  await page.waitForSelector('[name="username"]', { timeout: 60000 });
  await umbracoUi.login.enterEmail("warren@hackmakedo.com");
  await umbracoUi.login.enterPassword("password1234");
  await umbracoUi.login.clickLoginButton();
  // Wait for the SPA to settle after login before saving auth state.
  // Use checkSections=false to skip the all-sections visibility check —
  // on a fresh CI install the backoffice can be slow to render all tabs
  // and waiting up to 30 s per section (× 7 sections) causes timeouts.
  await page.waitForLoadState('networkidle');
  await umbracoUi.login.goToSection(ConstantHelper.sections.content, false);
  await page.context().storageState({path: STORAGE_STATE});
});
