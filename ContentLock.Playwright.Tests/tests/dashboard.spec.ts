import { test, expect, type Page } from '@playwright/test';
import { MyUiHelpers } from '../code/UiHelpers';
import { ConstantHelper } from '@umbraco/playwright-testhelpers';

const userAuthFile = 'playwright/.auth/user.json';
test.use({ storageState: userAuthFile });

test.beforeEach(async ({ page }) => {
    // TODO: How can we not keep repeating this line in every test?
    const umbracoUi = new MyUiHelpers(page);

    // Goto the Umbraco backoffice
    await page.goto('/umbraco');

    // Navigate to the content section
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
});

test.describe('Content Lock Dashboard', () => {

    test('is visible', async ({ page }) => {

        // TODO: How can we not keep repeating this line in every test?
        const umbracoUi = new MyUiHelpers(page);
        
        // Find content lock dashboard tab
        await expect(umbracoUi.contentLock.dashboardTab).toBeVisible();
    });

    test('correctly shows no locks', async ({ page }) => {
       // TODO: How can we not keep repeating this line in every test?
        const umbracoUi = new MyUiHelpers(page);

        // Click the dashboard tab
        await umbracoUi.contentLock.dashboardTab.click();

        // Check for a piece of text
        await expect(umbracoUi.contentLock.dashboardNoLocksMessage).toBeVisible(); 
        await expect(umbracoUi.contentLock.dashboardNoLocksMessage).toHaveText(/zero/); // Partial match 'zero' against zip, zero nada

        // Checks unlock button is disabled
        await expect(umbracoUi.contentLock.dashboardUnlockBtn).toBeVisible();

        // Disabled only works on native button and not uui-button hence the chained locator to look in shadow dom
        await expect(umbracoUi.contentLock.dashboardUnlockBtn.locator('button')).toBeDisabled(); 

        // Checks total count of locks is 0
    });

    // See list of locks

    // From the collection of locks 
    // Unlock a specifc lock/page and verify it is removed from the list
    // Do I test with the API that it also not returning the lock we removed?

   // Use unlock all button
   // Verify all locks are gone and no locks message is shown
   // Use API ?? to verify all locks are gone

})