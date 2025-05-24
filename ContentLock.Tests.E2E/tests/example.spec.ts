import { test, expect } from '@playwright/test';

test('homepage has expected title', async ({ page }) => {
  await page.goto('/'); // Navigates to baseURL
  // This is a placeholder. The actual title will depend on the ContentLock.Website homepage.
  // We'll refine this once we know the site is running.
  // For now, just check if it doesn't contain a common error message.
  await expect(page).not.toHaveTitle(/Error/);
  await expect(page).not.toHaveTitle(/Problem/);
  console.log('Page title:', await page.title());
});
