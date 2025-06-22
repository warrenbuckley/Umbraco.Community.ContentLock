import { Page } from "@playwright/test";
import { UiHelpers } from "@umbraco/playwright-testhelpers";

import dotenv from 'dotenv';
import { ContentLockUiHelper } from "./ContentLockUiHelper";

// Need to load the values from the .env file
// As rhe Umbraco npm package depends on using a .env with set variables
// So we can login and store the state of the login and persisted to a file
dotenv.config();

export class MyUiHelpers extends UiHelpers {

    public readonly contentLock: ContentLockUiHelper;

    constructor(page: Page) {
        super(page);
        this.contentLock = new ContentLockUiHelper(this.page);
    }
    
}