import { ConstantHelper } from '@umbraco/playwright-testhelpers';
import { test } from '../code/base';
import { expect } from '@playwright/test';

const userAuthFile = 'playwright/.auth/user.json';
test.use({ 
    storageState: userAuthFile,

    // https://playwright.dev/docs/api/class-testoptions#test-options-viewport
    // Default is 1280 x 720 (aka 720p HD)
    // 1920 x 1080 HD (1080p)
    // 2560 x 1440 (aka 1440p) or QHD
    // Need more screen real estate for this specific test as the number of locks on right is hidden at smaller breakpoints
    viewport: { 
        width: 1920, 
        height: 1080
    }
});

test.beforeEach(async ({ page, umbracoUi }) => {
    // Goto the Umbraco backoffice
    await page.goto('/umbraco');

    // Navigate to the content section
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
});

test.describe('Content Lock Dashboard', () => {

    test('is visible', async ({ dashboard }) => {

        // Find content lock dashboard tab
        await expect(dashboard.dashboardTab).toBeVisible();
    });

    test('correctly shows no locks', async ({ dashboard }) => {

        // Click the dashboard tab
        await dashboard.dashboardTab.click();

        // Check for a piece of text
        await expect(dashboard.dashboardNoLocksMessage).toBeVisible(); 
        await expect(dashboard.dashboardNoLocksMessage).toHaveText(/zero/); // Partial match 'zero' against zip, zero nada

        // Checks unlock button is disabled
        // Disabled only works on native button and not uui-button hence the chained locator to look in shadow dom
        await expect(dashboard.dashboardUnlockBtn).toBeVisible();
        await expect(dashboard.dashboardUnlockBtn.locator('button')).toBeDisabled();

        // Checks total count of locks is 0
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0'); // Expect the text to be 0
    });

    // See list of locks

    // From the collection of locks 
    // Unlock a specifc lock/page and verify it is removed from the list
    // Do I test with the API that it also not returning the lock we removed?

   // Use unlock all button
   // Verify all locks are gone and no locks message is shown
   // Use API ?? to verify all locks are gone

})