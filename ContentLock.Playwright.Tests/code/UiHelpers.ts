import { Page } from "@playwright/test";
import { UiHelpers } from "@umbraco/playwright-testhelpers";

import dotenv from 'dotenv';

// Need to load the values from the .env file
// As rhe Umbraco npm package depends on using a .env with set variables
// So we can login and store the state of the login and persisted to a file
dotenv.config();

export class MyUiHelpers extends UiHelpers {
    constructor(page: Page) {
        super(page);
    }

    async goToMyBackOffice() {
        const umbracoUrl = process.env.URL || 'http://localhost:3000';
        await this.page.goto(`${umbracoUrl}/umbraco`);
    }
}