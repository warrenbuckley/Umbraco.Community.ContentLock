import { Page } from "@playwright/test";
import { ApiHelpers } from "@umbraco/playwright-testhelpers";

export class Api extends ApiHelpers {
    
    constructor(page:Page) {
        super(page);
    }

    async resetContentLocks() {
        const response = await this.get('/umbraco/contentlock-e2e/api/reset');
        console.log("Reset Content Locks Response: Status & OK?", response.status(), response.ok());
        
        // Ensure the response is successful
        if (!response.ok()) {
            throw new Error(`Failed to reset content locks: ${response.status()} ${response.statusText()}`);
        }
        
        // Wait for the response body to be fully processed
        await response.text();
    }
}