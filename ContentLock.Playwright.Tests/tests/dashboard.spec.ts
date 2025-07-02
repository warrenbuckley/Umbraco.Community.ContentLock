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

test.beforeEach(async ({ page, umbracoUi, umbracoApi }) => {
    // Clean up any existing locks before each test
    //await umbracoApi.resetContentLocks();

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

        // Clicks the dashboard tab in the content section
        await dashboard.goto();

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

    test('user can lock a page and see it in the dashboard', async ({ page, umbracoUi, dashboard }) => {
        // The test site has Pauls Seals Clean SK in it
        // So we know which pages/nodes exist to lock

        // Clicks the dashboard tab in the content section
        await dashboard.goto();

        // Verify we start off with no locks
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0'); // Expect the text to be 0


        // Find the 'Home' node in the tree and click the actions menu for it
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // See if the lock action menu item is visible
        // entity-action:contentlock.entityaction.document.lock
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Click the lock action menu item
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();

        // Verify the dashboard updated/changed
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('1'); // Expect the text to be 1    )

        // Need to also check can see the item in the list
        // Verify the following:
        // * Node Name = 'Home'
        // * Node Type = 'home'
        // * User who locked it = 'warren'

        // Count number of rows in table (This excludes the header row)
        // Filter out header rows by checking for columnheader cells
        const dataRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        await expect(dataRows).toHaveCount(1);
    });
})