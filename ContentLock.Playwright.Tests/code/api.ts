import { Page } from "@playwright/test";
import { ApiHelpers } from "@umbraco/playwright-testhelpers";

export class Api extends ApiHelpers {
    
    constructor(page:Page) {
        super(page);
    }

    async resetContentLocks() {
        const response = await this.get('/umbraco/contentlock-e2e/api/reset');
        console.log("Reset Content Locks Response: Status & OK", response.status(), response.ok());
    }
}