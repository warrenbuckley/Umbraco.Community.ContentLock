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
    // Goto the Umbraco backoffice
    await page.goto('/umbraco');

    // Navigate to the content section
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);

    // Clean up any existing locks before each test
    await umbracoApi.resetContentLocks();
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

        // Checks total count of locks is 0
        await dashboard.showsNumberOfLocks(0);
    });

    test('user can lock a page and see it in the dashboard', async ({ page, umbracoUi, dashboard }) => {
        // The test site has Pauls Seals Clean SK in it
        // So we know which pages/nodes exist to lock

        // Clicks the dashboard tab in the content section
        await dashboard.goto();

        // Verify we start off with no locks
        await dashboard.showsNumberOfLocks(0);

        // Find the 'Home' node in the tree and click the actions menu for it
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // See if the lock action menu item is visible
        // entity-action:contentlock.entityaction.document.lock
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Click the lock action menu item and wait for the API response
        const lockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/Lock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
        await lockResponsePromise;

        // Verify the dashboard updated/changed
        await dashboard.showsNumberOfLocks(1);

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

    test('user unlocks a page and is removed from the dashboard', async ({ page, umbracoUi, dashboard }) => {
        // The test site has Pauls Seals Clean SK in it
        // So we know which pages/nodes exist to lock

        // Clicks the dashboard tab in the content section
        await dashboard.goto();

        // Verify we start off with no locks
        await dashboard.showsNumberOfLocks(0);

        // Find the 'Home' node in the tree and click the actions menu for it
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // See if the lock action menu item is visible
        // entity-action:contentlock.entityaction.document.lock
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Click the lock action menu item and wait for the API response instead of a hardcoded timeout
        const lockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/Lock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
        await lockResponsePromise;

        // TODO: Remove this when bug is fixed that enttiy action will close the menu
        // We are manually closing/toggling the actions menu closed
        // https://github.com/umbraco/Umbraco-CMS/issues/19761
        // ==========================================================================
        await umbracoUi.content.clickActionsMenuForContent('Home');
        // ==========================================================================

        // Verify the dashboard updated/changed
        await dashboard.showsNumberOfLocks(1);

        // Now we have a lock, lets unlock it
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // See if the unlock action menu item is visible
        // entity-action:contentlock.entityaction.document.unlock
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.unlock')).toBeVisible();

        // Click the unlock action menu item and wait for the API response
        const unlockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/Unlock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.unlock').click();
        await unlockResponsePromise;

        // TODO: Remove this when bug is fixed that enttiy action will close the menu
        // We are manually closing/toggling the actions menu closed
        // https://github.com/umbraco/Umbraco-CMS/issues/19761
        // ==========================================================================
        await umbracoUi.content.clickActionsMenuForContent('Home');
        // ==========================================================================

        // Verify/assert stuff
        await dashboard.showsNumberOfLocks(0);

        await expect(dashboard.dashboardNoLocksMessage).toBeVisible();
        await expect(dashboard.dashboardNoLocksMessage).toHaveText(/zero/); // Partial match 'zero' against zip, zero nada

    });

    test('user can bulk unlock all pages', async ({ page, umbracoUi, dashboard }) => {
        // Navigate to the dashboard
        await dashboard.goto();

        // Verify we start with no locks
        await dashboard.showsNumberOfLocks(0);

        // Find the 'Home' node in the tree and click the actions menu
        await umbracoUi.content.clickActionsMenuForContent('Home');
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Lock 'Home' and wait for API response
        const lockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/Lock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
        await lockResponsePromise;

        // TODO: Remove this when bug is fixed that entity action will close the menu
        // We are manually closing/toggling the actions menu closed
        // https://github.com/umbraco/Umbraco-CMS/issues/19761
        // ==========================================================================
        await umbracoUi.content.clickActionsMenuForContent('Home');
        // ==========================================================================

        // Verify dashboard shows 1 lock
        await dashboard.showsNumberOfLocks(1);

        // Select the locked row in the dashboard table so the bulk unlock button becomes enabled
        const dataRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        await expect(dataRows).toHaveCount(1);
        await dataRows.first().click();

        // Verify the unlock button is now enabled
        await expect(dashboard.dashboardUnlockBtn).not.toBeDisabled();

        // Click the bulk unlock button and wait for the API response
        const bulkUnlockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/BulkUnlock') && resp.status() === 200
        );
        await dashboard.dashboardUnlockBtn.click();
        await bulkUnlockResponsePromise;

        // Verify all locks are gone
        await dashboard.showsNumberOfLocks(0);
        await expect(dashboard.dashboardNoLocksMessage).toBeVisible();
        await expect(dashboard.dashboardNoLocksMessage).toHaveText(/zero/);
    });

    test('user without permissions cannot override a locked page', async ({ page, umbracoUi, browser }) => {
        const restrictedAuthFile = 'playwright/.auth/restricted-user.json';

        // Warren locks 'Home' via entity action
        await umbracoUi.content.clickActionsMenuForContent('Home');
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Lock and capture the content key from the API response
        const lockResponsePromise = page.waitForResponse(resp =>
            resp.url().includes('/umbraco/contentlock/api/v1/Lock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
        const lockResponse = await lockResponsePromise;
        const lockData = await lockResponse.json();
        const contentKey: string = lockData.key;

        // TODO: Remove this when bug is fixed that entity action will close the menu
        // We are manually closing/toggling the actions menu closed
        // https://github.com/umbraco/Umbraco-CMS/issues/19761
        // ==========================================================================
        await umbracoUi.content.clickActionsMenuForContent('Home');
        // ==========================================================================

        // Open a second browser context as the restricted user (no ContentLock.Unlocker permission)
        const restrictedContext = await browser.newContext({
            storageState: restrictedAuthFile,
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
        });
        const restrictedPage = await restrictedContext.newPage();

        try {
            // Restricted user navigates to the locked content's workspace.
            // First go to /umbraco to establish the backoffice shell, then navigate to the workspace.
            await restrictedPage.goto('/umbraco');
            await restrictedPage.waitForLoadState('networkidle');
            await restrictedPage.goto(`/umbraco/section/content/workspace/document/edit/${contentKey}`);
            await restrictedPage.waitForLoadState('networkidle');

            // Verify the workspace footer app is visible, showing it is locked.
            // Allow extra time for SignalR to deliver the lock state to this new client.
            const footerApp = restrictedPage.locator('contentlock-workspacefooterapp');
            await expect(footerApp).toBeVisible({ timeout: 15000 });

            // Verify the restricted user does NOT see the Unlock entity action
            // (they are missing ContentLock.Unlocker granular permission).
            // Use .first() — there are multiple umb-entity-actions-bundle elements in the page
            // (workspace header, tree items, etc.); we want the workspace header one.
            await restrictedPage.locator('umb-entity-actions-bundle').first().click();
            await expect(
                restrictedPage.getByTestId('entity-action:contentlock.entityaction.document.unlock')
            ).not.toBeVisible();
        } finally {
            await restrictedContext.close();
        }
    });
})
