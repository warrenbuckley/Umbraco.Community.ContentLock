// Example of how to use the reset API in Playwright tests
// This replaces the commented-out line in the original dashboard.spec.ts

import { ConstantHelper } from '@umbraco/playwright-testhelpers';
import { test } from '../code/base';
import { expect } from '@playwright/test';

const userAuthFile = 'playwright/.auth/user.json';
test.use({ 
    storageState: userAuthFile,
    viewport: { 
        width: 1920, 
        height: 1080
    }
});

test.beforeEach(async ({ page, umbracoUi, umbracoApi }) => {
    // Clean up any existing locks before each test
    // This replaces the commented-out line: //await umbracoApi.resetContentLocks();
    try {
        await umbracoApi.resetContentLocks();
        console.log('Content locks reset successfully');
    } catch (error) {
        console.warn('Could not reset content locks (may not be available in this environment):', error.message);
        // Continue with test even if reset fails (e.g., in production environments)
    }

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

    test('correctly shows no locks after reset', async ({ dashboard }) => {
        // Clicks the dashboard tab in the content section
        await dashboard.goto();

        // After reset, should show no locks
        await expect(dashboard.dashboardNoLocksMessage).toBeVisible(); 
        await expect(dashboard.dashboardNoLocksMessage).toHaveText(/zero/);

        // Checks unlock button is disabled
        await expect(dashboard.dashboardUnlockBtn).toBeVisible();
        await expect(dashboard.dashboardUnlockBtn.locator('button')).toBeDisabled();

        // Checks total count of locks is 0
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0');
    });

    test('user can lock a page and see it in the dashboard', async ({ page, umbracoUi, dashboard }) => {
        // Clicks the dashboard tab in the content section
        await dashboard.goto();

        // Verify we start off with no locks (thanks to beforeEach reset)
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0');

        // Find the 'Home' node in the tree and click the actions menu for it
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // Click the lock action menu item
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();

        // Verify the dashboard updated/changed
        await expect(dashboard.dashboardNumberOfLocks).toBeVisible();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('1');

        // Count number of rows in table (This excludes the header row)
        const dataRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        await expect(dataRows).toHaveCount(1);
    });

    test('reset API clears locks created in previous test', async ({ dashboard, umbracoApi }) => {
        // This test demonstrates that the reset API works between tests
        await dashboard.goto();

        // Should have no locks due to beforeEach reset, even though previous test created one
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0');
        await expect(dashboard.dashboardNoLocksMessage).toBeVisible();

        // Verify we can manually reset as well
        await umbracoApi.resetContentLocks();
        
        // Should still be 0
        await page.reload();
        await dashboard.goto();
        await expect(dashboard.dashboardNumberOfLocks).toHaveText('0');
    });
})