import { test, expect, type Page } from '@playwright/test';
import { MyUiHelpers } from '../code/UiHelpers';
import { ConstantHelper } from '@umbraco/playwright-testhelpers';

const userAuthFile = 'playwright/.auth/user.json';
test.use({ storageState: userAuthFile });

test.beforeEach(async ({ page }) => {
  // Goto the Umbraco backoffice
  const umbracoUi = new MyUiHelpers(page);
  await umbracoUi.goToMyBackOffice();
});

test.describe('Content Lock Dashboard', () => {


    test('is visible', async ({ page }) => {

        // TODO: How can we not keep repeating this line in every test?
        const umbracoUi = new MyUiHelpers(page);

        // Navigate to the content section
        await umbracoUi.content.goToSection(ConstantHelper.sections.content);

        // Find content lock dashboard tab
        await expect(umbracoUi.contentLock.dashboardTab).toBeVisible();
    });

    test('can I see a message when no locks are present', async ({ page }) => {
        // Check for a piece of text
    });

    // See list of locks

    // From the collection of locks 
    // Unlock a specifc lock/page and verify it is removed from the list
    // Do I test with the API that it also not returning the lock we removed?

   // Use unlock all button
   // Verify all locks are gone and no locks message is shown
   // Use API ?? to verify all locks are gone

});