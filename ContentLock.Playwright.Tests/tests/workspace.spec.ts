import * as path from 'path';
import { test } from '../code/base';
import { ConstantHelper } from '@umbraco/playwright-testhelpers';
import { expect } from '@playwright/test';

const warrenAuthFile = path.join(__dirname, '../playwright/.auth/user.json');
const restrictedAuthFile = path.join(__dirname, '../playwright/.auth/restricted-user.json');

test.use({
    storageState: warrenAuthFile,
    viewport: { width: 1920, height: 1080 },
});

test.beforeEach(async ({ page, umbracoUi, umbracoApi }) => {
    await page.goto('/umbraco');
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
    await umbracoApi.resetContentLocks();
});

// Helper: lock 'Home' via the entity action menu and return the content key from the API response.
async function lockHomeNode(page: any, umbracoUi: any): Promise<string> {
    await umbracoUi.content.clickActionsMenuForContent('Home');
    await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

    const lockResponsePromise = page.waitForResponse((resp: any) =>
        resp.url().includes('/umbraco/api/contentlock/v1/Lock/') && resp.status() === 200
    );
    await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
    const lockResponse = await lockResponsePromise;
    const lockData = await lockResponse.json();

    // TODO: Remove this when bug is fixed that entity action will close the menu
    // We are manually closing/toggling the actions menu closed
    // https://github.com/umbraco/Umbraco-CMS/issues/19761
    // ==========================================================================
    await umbracoUi.content.clickActionsMenuForContent('Home');
    // ==========================================================================

    return lockData.key as string;
}

test.describe('Workspace Footer App', () => {

    test('workspace footer is visible when the current user has locked the page', async ({ page, umbracoUi }) => {
        // Warren locks Home and gets the content key from the API response
        const contentKey = await lockHomeNode(page, umbracoUi);

        // Navigate to the locked content workspace using the Umbraco Bellissima deep-link URL
        await page.goto(`/umbraco/section/content/workspace/Umb.Workspace.Document/edit/${contentKey}`);

        // The workspace footer app element should be present and visible
        const footerApp = page.locator('contentlock-workspacefooterapp');
        await expect(footerApp).toBeVisible();
    });

    test('workspace footer is visible for a user viewing a page locked by another user', async ({ page, umbracoUi, browser }) => {
        // Warren locks Home and captures the content key
        const contentKey = await lockHomeNode(page, umbracoUi);

        // Open a second browser context for the restricted user (no ContentLock.Unlocker permission)
        const restrictedContext = await browser.newContext({
            storageState: restrictedAuthFile,
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
        });
        const restrictedPage = await restrictedContext.newPage();

        try {
            // Restricted user navigates to the locked content's workspace
            await restrictedPage.goto('/umbraco');
            await restrictedPage.waitForLoadState('domcontentloaded');
            await restrictedPage.goto(
                `/umbraco/section/content/workspace/Umb.Workspace.Document/edit/${contentKey}`
            );

            // The footer app should show the page is locked by someone else
            const footerApp = restrictedPage.locator('contentlock-workspacefooterapp');
            await expect(footerApp).toBeVisible();
        } finally {
            await restrictedContext.close();
        }
    });

    test('workspace footer is not visible when the page is unlocked', async ({ page, umbracoUi }) => {
        // Lock then immediately unlock Home so the page is in the unlocked state
        const contentKey = await lockHomeNode(page, umbracoUi);

        // Unlock via entity action
        await umbracoUi.content.clickActionsMenuForContent('Home');
        const unlockResponsePromise = page.waitForResponse((resp: any) =>
            resp.url().includes('/umbraco/api/contentlock/v1/Unlock/') && resp.status() === 200
        );
        await page.getByTestId('entity-action:contentlock.entityaction.document.unlock').click();
        await unlockResponsePromise;

        // TODO: Remove this when bug is fixed that entity action will close the menu
        // https://github.com/umbraco/Umbraco-CMS/issues/19761
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // Navigate to the (now unlocked) content workspace
        await page.goto(`/umbraco/section/content/workspace/Umb.Workspace.Document/edit/${contentKey}`);

        // Footer app should not render anything meaningful for an unlocked page
        // The element may exist in the DOM but should not show a "locked" message
        const footerApp = page.locator('contentlock-workspacefooterapp');
        await expect(footerApp).not.toContainText(/locked/i);
    });
});

test.describe('Lock/Unlock Entity Actions Visibility', () => {

    test('Lock action is visible and Unlock action is hidden when page is not locked', async ({ page, umbracoUi }) => {
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // Lock should be available (no lock in place)
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).toBeVisible();

        // Unlock should not be present (nothing to unlock)
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.unlock')).not.toBeVisible();
    });

    test('Unlock action is visible and Lock action is hidden when page is locked', async ({ page, umbracoUi }) => {
        // Lock the page first
        await lockHomeNode(page, umbracoUi);

        // Re-open the actions menu
        await umbracoUi.content.clickActionsMenuForContent('Home');

        // After locking, Unlock should be available and Lock hidden
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.unlock')).toBeVisible();
        await expect(page.getByTestId('entity-action:contentlock.entityaction.document.lock')).not.toBeVisible();
    });

    test('restricted user cannot see Unlock action for a page locked by another user', async ({ page, umbracoUi, browser }) => {
        // Warren locks Home
        const contentKey = await lockHomeNode(page, umbracoUi);

        // Open a browser context as the restricted user
        const restrictedContext = await browser.newContext({
            storageState: restrictedAuthFile,
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
        });
        const restrictedPage = await restrictedContext.newPage();

        try {
            // Restricted user navigates to the locked content workspace
            await restrictedPage.goto('/umbraco');
            await restrictedPage.waitForLoadState('domcontentloaded');
            await restrictedPage.goto(
                `/umbraco/section/content/workspace/Umb.Workspace.Document/edit/${contentKey}`
            );

            // Open the entity actions menu on the workspace
            // In Umbraco 17 the actions are accessible via the actions button in the workspace header
            await restrictedPage.locator('umb-entity-actions-bundle').click();

            // The Unlock action should not be visible (no ContentLock.Unlocker permission)
            await expect(
                restrictedPage.getByTestId('entity-action:contentlock.entityaction.document.unlock')
            ).not.toBeVisible();
        } finally {
            await restrictedContext.close();
        }
    });
});
