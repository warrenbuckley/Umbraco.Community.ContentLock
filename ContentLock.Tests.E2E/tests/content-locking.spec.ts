import { test, expect, Page } from '@playwright/test';

// Helper function to navigate to a specific content item in the tree and open it
// This will likely need to be adapted based on the actual content structure of the test site
async function navigateToContentItem(page: Page, itemName: string = "Home") {
  await page.goto('/umbraco#/content');
  await expect(page.locator('umb-tree[alias="Umb.Tree.Content"]')).toBeVisible({ timeout: 15000 });

  // Expand root if necessary - this depends on the default state of the tree
  // const rootTreeItem = page.locator('umb-tree-item').first(); // Adjust if needed
  // if (await rootTreeItem.getAttribute('aria-expanded') === 'false') {
  //   await rootTreeItem.locator('[data-element="tree-item-expand"]').click();
  // }
  
  // Click on the "Home" page in the content tree.
  // This selector might need to be very specific if there are many items.
  const contentItemLink = page.locator(`umb-tree-item a[title="${itemName}"]`).first();
  await expect(contentItemLink).toBeVisible({ timeout: 10000 });
  await contentItemLink.click();

  // Wait for the content editor to load for the item
  // Check for the header that typically shows the content item's name
  await expect(page.locator(`umb-editor-view input[name="headerName"]`)).toHaveValue(itemName, { timeout: 15000 });
  console.log(`Navigated to content item: ${itemName}`);
}

// Helper function to find the "Lock" button/icon and click it
// This is highly dependent on ContentLock's UI
async function lockPage(page: Page) {
  // Common places for a lock button:
  // 1. Near the save/publish buttons
  // 2. As an action in the "Actions" menu
  // 3. A dedicated icon in the editor header or footer
  
  // Placeholder: Assume a button with a specific test ID or visible text
  const lockButton = page.locator('[data-element="content-lock-button"], button:has-text("Lock for editing")').first();
  await expect(lockButton).toBeVisible({ timeout: 10000 });
  await lockButton.click();
  
  // Wait for some confirmation that the page is locked
  // This could be the button text changing, an icon appearing, or a notification
  await expect(page.locator('[data-element="content-locked-indicator"], :text("Page is locked by you")')).toBeVisible({ timeout: 10000 });
  console.log('Page locked.');
}

// Helper function to find the "Unlock" button/icon and click it
async function unlockPage(page: Page) {
  const unlockButton = page.locator('[data-element="content-unlock-button"], button:has-text("Unlock")').first();
  await expect(unlockButton).toBeVisible({ timeout: 10000 });
  await unlockButton.click();

  // Wait for confirmation that the page is unlocked
  await expect(page.locator('[data-element="content-lock-button"], button:has-text("Lock for editing")')).toBeVisible({ timeout: 10000 }); // Lock button should reappear
  console.log('Page unlocked.');
}


test.describe('Content Locking Functionality', () => {
  // This test suite uses the authenticated state from auth.setup.ts

  test('successfully navigates to Content section', async ({ page }) => {
    await page.goto('/umbraco#/content');
    await expect(page.locator('umb-tree[alias="Umb.Tree.Content"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1.umb-title:has-text("Content")')).toBeVisible({ timeout: 10000 });
    console.log('Successfully navigated to Content section.');
  });

  test('User A can lock a content page', async ({ page }) => {
    await navigateToContentItem(page, "Home"); // Assumes "Home" page exists

    // Ensure page is not locked by someone else initially (or by self from a previous failed test)
    // This might require an initial unlock or checking the state.
    // For now, we assume it's available to be locked.
    // A more robust test might try to unlock first if an unlock button is visible.

    await lockPage(page);

    // Verify UI changes indicating the page is locked by the current user
    // Example: Save/Publish buttons might still be enabled for the locker
    const saveButton = page.locator('umb-button[alias=" Umb.Button.Save"] button, button[label="Save"]'); // Umbraco 13/14 might use label attribute
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // Placeholder: Check if elements that should be hidden for *other* users are indeed present for the locker.
    // This doesn't directly test the "other user" scenario but confirms the locker's view.
  });

  test('User A sees restricted UI when page is locked by them (and can unlock)', async ({ page }) => {
    // This test assumes the previous test successfully locked the page,
    // or it could be a standalone test that locks the page first.
    // For robustness, let's lock it here again or ensure it's locked.
    await navigateToContentItem(page, "Home");
    
    // Check if already locked by self, if not, lock it.
    const unlockButtonVisible = await page.locator('[data-element="content-unlock-button"], button:has-text("Unlock")').first().isVisible().catch(() => false);
    if (!unlockButtonVisible) {
      console.log("Page not locked by self, attempting to lock now...");
      await lockPage(page);
    } else {
      console.log("Page already locked by self.");
    }
    
    await expect(page.locator('[data-element="content-locked-indicator"], :text("Page is locked by you")')).toBeVisible();

    // Example: Verify Save button is still enabled for the user who locked it
    const saveButton = page.locator('umb-button[alias=" Umb.Button.Save"] button, button[label="Save"]');
    await expect(saveButton).toBeEnabled();

    await unlockPage(page);

    // Verify UI changes indicating page is unlocked
    const lockButton = page.locator('[data-element="content-lock-button"], button:has-text("Lock for editing")').first();
    await expect(lockButton).toBeVisible();
    await expect(saveButton).toBeEnabled(); // Save button should still be enabled
  });

  // Test Case for "locked by another user" is more complex as it requires a second authenticated context.
  // This would typically be done by:
  // 1. User A locks item.
  // 2. Test saves state (item is locked by User A).
  // 3. A new test starts with User B's authenticated state.
  // 4. User B navigates to item and sees it locked by User A, with disabled save/publish.
  // This is beyond a single subtask for now. We are focusing on User A's interaction.
});
