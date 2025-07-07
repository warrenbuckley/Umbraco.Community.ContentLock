// Updated API helper for ContentLock testing
// This replaces the TODO comment in the original Playwright test files

import { Page } from "@playwright/test";
import { ApiHelpers } from "@umbraco/playwright-testhelpers";

export class Api extends ApiHelpers {
    
    constructor(page: Page) {
        super(page);
    }

    /**
     * Resets all content locks by calling the test API endpoint.
     * This endpoint is only available in Development environment.
     * @returns Promise that resolves when locks are reset
     */
    async resetContentLocks(): Promise<void> {
        try {
            const response = await this.post('/umbraco/api/test/reset-contentlocks');
            
            if (!response.ok) {
                if (response.status === 403) {
                    console.warn('Reset content locks API is not available (likely production environment)');
                    return;
                }
                throw new Error(`Failed to reset content locks: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                console.log(`Successfully reset content locks: ${result.message}`);
            } else {
                throw new Error(`Reset content locks failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Error resetting content locks:', error);
            throw error;
        }
    }
}