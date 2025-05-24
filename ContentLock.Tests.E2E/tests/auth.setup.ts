import { test as setup, expect } from '@playwright/test';

const adminUserFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  // Use environment variables or fall back to defaults
  const username = process.env.UMBRACO_USER || 'test@example.com'; // Replace with a common Umbraco admin user
  const password = process.env.UMBRACO_PASS || 'Test1234567890';   // Replace with a common Umbraco admin password

  await page.goto('/umbraco'); // Navigate to Umbraco backoffice

  // Wait for the login form to be visible
  await page.waitForSelector('form[name="loginForm"]', { timeout: 20000 }); // Increased timeout

  // Fill in username and password
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  
  // Click the login button
  await page.locator('button[type="submit"]').click();

  // Wait for navigation to the dashboard or a known element after login
  // Update selector if needed based on Umbraco version
  await expect(page.locator('umb-dashboard-content-blocks')).toBeVisible({ timeout: 20000 }); 
  await expect(page.locator('text=Welcome to Umbraco')).toBeVisible({ timeout: 10000 });


  // End of authentication steps.
  await page.context().storageState({ path: adminUserFile });
  console.log(`Authentication state saved to ${adminUserFile}`);
});
