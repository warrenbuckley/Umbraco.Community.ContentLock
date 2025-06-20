import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  //await page.goto('https://demo.playwright.dev/todomvc');

  // Navigate to the content section
  // Navigate to our conent lock dashboard

  // Use our Management API to remove all locks
});

test.describe('Content Lock Dashboard', () => {

    test('is visible', async ({ page }) => {
        // Can we see the dashboard
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