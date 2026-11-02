import * as path from 'path';
import { Browser, Page, expect } from '@playwright/test';
import { ConstantHelper } from '@umbraco/playwright-testhelpers';
import { test } from '../code/base';
import { closeEntityActionsMenu } from '../code/entityActions';

// Auto Lock is enabled for the test site in ContentLock.Website/appsettings.json with short timings:
// InactivityTimeoutSeconds 20, HeartbeatSeconds 5, InactivityCheckSeconds 5.
const INACTIVITY_RELEASE_MS = 45_000; // timeout + check interval + margin

const warrenAuthFile = path.join(__dirname, '../playwright/.auth/user.json');
const restrictedAuthFile = path.join(__dirname, '../playwright/.auth/restricted-user.json');

test.use({
    storageState: warrenAuthFile,
    viewport: { width: 1920, height: 1080 },
});

let aboutKey: string;

test.beforeEach(async ({ page, umbracoUi, umbracoApi }) => {
    await page.goto('/umbraco');
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
    await umbracoApi.resetContentLocks();

    // Resolve the About node's key from its workspace URL
    await umbracoUi.content.clickCaretButtonForContentName('Home');
    await umbracoUi.content.goToContentWithName('About');
    await page.waitForURL(/\/workspace\/document\/edit\/[0-9a-f-]{36}/);
    aboutKey = page.url().match(/edit\/([0-9a-f-]{36})/)![1];
});

const subtitleField = (page: Page) => page.getByRole('textbox', { name: 'Field for Subtitle' });
const lockFooter = (page: Page) => page.locator('contentlock-workspacefooterapp');
const reloadPrompt = (page: Page) => page.getByRole('button', { name: 'Reload', exact: true });
const saveButton = (page: Page) => page.getByRole('button', { name: 'Save', exact: true });

async function openUserPage(browser: Browser, authFile: string) {
    const context = await browser.newContext({ storageState: authFile, viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
    return { context, page: await context.newPage() };
}

async function openAbout(page: Page) {
    await page.goto('/umbraco');
    await page.waitForLoadState('networkidle');
    await page.goto(`/umbraco/section/content/workspace/document/edit/${aboutKey}`);
    await page.waitForLoadState('networkidle');
    await expect(subtitleField(page)).toBeVisible({ timeout: 15000 });
}

async function editSubtitle(page: Page) {
    const field = subtitleField(page);
    await field.click();
    await field.press('End');
    await field.pressSequentially(` ${Date.now()}`);
}

test.describe('Auto Lock', () => {
    // Each test drives two backoffice sessions
    test.describe.configure({ timeout: 90_000 });

    test('editing a node auto-locks it and makes it read-only for other users', async ({ page, browser }) => {
        const other = await openUserPage(browser, restrictedAuthFile);
        try {
            await openAbout(page);
            await openAbout(other.page);
            await expect(lockFooter(other.page)).not.toBeVisible();

            await editSubtitle(page);

            await expect(lockFooter(page)).toBeVisible({ timeout: 10000 });
            await expect(lockFooter(other.page)).toBeVisible({ timeout: 10000 });
            await expect(subtitleField(other.page)).not.toBeEditable();
        } finally {
            await other.context.close();
        }
    });

    test('saving releases the auto-lock and prompts other viewers to reload', async ({ page, browser }) => {
        const other = await openUserPage(browser, restrictedAuthFile);
        try {
            await openAbout(page);
            await openAbout(other.page);
            await editSubtitle(page);
            await expect(lockFooter(other.page)).toBeVisible({ timeout: 10000 });

            await saveButton(page).click();

            await expect(lockFooter(page)).not.toBeVisible({ timeout: 10000 });
            await expect(reloadPrompt(other.page)).toBeVisible({ timeout: 10000 });
        } finally {
            await other.context.close();
        }
    });

    test('leaving without saving releases the auto-lock without a reload prompt', async ({ page, browser }) => {
        const other = await openUserPage(browser, restrictedAuthFile);
        try {
            await openAbout(page);
            await openAbout(other.page);
            await editSubtitle(page);
            await expect(lockFooter(other.page)).toBeVisible({ timeout: 10000 });

            await page.getByText('Features', { exact: true }).click();
            await page.getByRole('button', { name: 'Discard changes' }).click();

            await expect(lockFooter(other.page)).not.toBeVisible({ timeout: 10000 });
            await expect(reloadPrompt(other.page)).not.toBeVisible();
        } finally {
            await other.context.close();
        }
    });

    test('closing the editor\'s browser releases the auto-lock', async ({ page, browser }) => {
        const editor = await openUserPage(browser, restrictedAuthFile);
        await openAbout(editor.page);
        await openAbout(page);

        await editSubtitle(editor.page);
        await expect(lockFooter(page)).toBeVisible({ timeout: 10000 });

        await editor.context.close();

        await expect(lockFooter(page)).not.toBeVisible({ timeout: 15000 });
    });

    test('an idle auto-lock is released after the inactivity timeout', async ({ page, browser }) => {
        const other = await openUserPage(browser, restrictedAuthFile);
        try {
            await openAbout(page);
            await openAbout(other.page);
            await editSubtitle(page);
            await expect(lockFooter(other.page)).toBeVisible({ timeout: 10000 });

            await expect(lockFooter(other.page)).not.toBeVisible({ timeout: INACTIVITY_RELEASE_MS });
            await expect(reloadPrompt(other.page)).not.toBeVisible();
        } finally {
            await other.context.close();
        }
    });

    test('the editor is warned by name when another user removes their auto-lock', async ({ page, browser, dashboard }) => {
        const editor = await openUserPage(browser, restrictedAuthFile);
        try {
            await openAbout(editor.page);
            await editSubtitle(editor.page);
            await expect(lockFooter(editor.page)).toBeVisible({ timeout: 10000 });

            await dashboard.goto();
            await dashboard.showsNumberOfLocks(1);
            await page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first().click();
            await expect(dashboard.dashboardUnlockBtn).not.toBeDisabled();
            await dashboard.dashboardUnlockBtn.click();

            // Scoped to the toast area: Umbraco also repeats the message in a screen-reader alert region
            const toast = editor.page.locator('#notifications');
            await expect(toast.getByText('Lock Removed')).toBeVisible({ timeout: 10000 });
            await expect(toast.getByText('Warren Buckley has unlocked this page')).toBeVisible();
        } finally {
            await editor.context.close();
        }
    });

    test('a manual lock is not released when its owner edits and saves', async ({ page, umbracoUi, dashboard }) => {
        await openAbout(page);
        await umbracoUi.content.clickActionsMenuForContent('About');
        const lockResponse = page.waitForResponse(resp => resp.url().includes('/umbraco/contentlock/api/v1/Lock/') && resp.status() === 200);
        await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
        await lockResponse;

        await closeEntityActionsMenu(page, umbracoUi, 'About');

        await editSubtitle(page);
        const saveResponse = page.waitForResponse(resp => resp.request().method() === 'PUT' && resp.url().includes(`/document/${aboutKey}`) && resp.ok());
        await saveButton(page).click();
        await saveResponse;

        await dashboard.goto();
        await dashboard.showsNumberOfLocks(1);
    });
});
