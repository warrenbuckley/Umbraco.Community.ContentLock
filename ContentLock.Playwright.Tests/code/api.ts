import { Page } from "@playwright/test";
import { ApiHelpers } from "@umbraco/playwright-testhelpers";

export class Api extends ApiHelpers {
    
    constructor(page:Page) {
        super(page);
    }

    async resetContentLocks() {
        // If you have a test database cleanup endpoint
        // TODO: call some test API that will only exist in the test site
        await this.post('/umbraco/api/test/reset-contentlocks');
    }
}