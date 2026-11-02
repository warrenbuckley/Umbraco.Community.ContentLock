import { Page, expect } from "@playwright/test";
import { UiHelpers } from "@umbraco/playwright-testhelpers";

/**
 * Closes the entity actions menu after an action, which Umbraco leaves open
 * (https://github.com/umbraco/Umbraco-CMS/issues/19761). Umbraco 17.8 closes it on Escape but no longer
 * when the actions button is clicked again; 17.3 does the opposite, so try Escape first, then the button.
 */
export async function closeEntityActionsMenu(page: Page, umbracoUi: UiHelpers, contentName: string) {
    // Any menu item of the open actions menu; the Content Lock ones re-render (Lock -> Unlock) right after an action
    const menuItem = page.locator('uui-menu-item[data-mark^="entity-action:"]').first();
    if (await menuItem.isHidden()) {
        return;
    }

    await page.keyboard.press('Escape');
    try {
        await expect(menuItem).toBeHidden({ timeout: 2000 });
    } catch {
        await umbracoUi.content.clickActionsMenuForContent(contentName);
        await expect(menuItem).toBeHidden();
    }
}
