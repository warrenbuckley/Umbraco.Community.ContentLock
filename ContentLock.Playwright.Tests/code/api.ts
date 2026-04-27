import { Page } from "@playwright/test";
import { ApiHelpers } from "@umbraco/playwright-testhelpers";

export class Api extends ApiHelpers {

    constructor(page:Page) {
        super(page);
    }

    async resetContentLocks() {
        const response = await this.page.request.get('/umbraco/contentlock-e2e/api/reset', {
            ignoreHTTPSErrors: true,
        });
        if (!response.ok()) {
            throw new Error(`Failed to reset content locks: ${response.status()} ${response.statusText()}`);
        }
        await response.text();
    }
}