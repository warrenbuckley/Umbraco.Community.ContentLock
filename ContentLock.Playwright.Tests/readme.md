# ContentLock Playwright E2E Tests

End-to-end tests for the [Umbraco.Community.ContentLock](https://github.com/warrenbuckley/Umbraco.Community.ContentLock) package. Built with [Playwright](https://playwright.dev/) and the [`@umbraco/playwright-testhelpers`](https://www.npmjs.com/package/@umbraco/playwright-testhelpers) package. Tests cover the workspace footer app, lock/unlock entity actions, the ContentLock dashboard, and multi-user permission scenarios (ensuring editors without the `ContentLock.Unlocker` permission cannot unlock other users' locks).

---

## Prerequisites

- **Node.js** (LTS recommended)
- **.NET 10 SDK**
- **ContentLock frontend built** — run `npm run build` inside `ContentLock/Client/` before running tests for the first time (or whenever you change TypeScript source)

---

## Install & Setup

```bash
cd ContentLock.Playwright.Tests
npm ci
npx playwright install --with-deps
```

`--with-deps` installs all three browser engines (Chromium, Firefox, WebKit) plus their OS-level dependencies. On CI, only Chromium is installed to keep the pipeline fast — locally all three run for cross-browser coverage.

The `playwright/.auth/` directory (gitignored) is created automatically on the first run. It holds the saved session storage state for the two test users so that subsequent tests don't need to log in again.

> **macOS port conflict note:** macOS AirPlay Receiver (Monterey and later) binds port 5000, which historically conflicted with the Playwright health-check URL. The config deliberately uses port 5002 for the health check (`http://localhost:5002/umbraco/api/health/ready`) so no action is needed on your part — just don't manually pre-start the website on port 5001 before running tests.

---

## Running the Tests

The `webServer` block in `playwright.config.ts` **automatically starts `ContentLock.Website`** on `https://localhost:5001` and waits until Umbraco's readiness probe returns HTTP 200 before running any test. Do not start the website manually beforehand.

### CLI (standard run)

```bash
npm test
# or
npx playwright test
```

### Interactive UI mode

```bash
npm run test:ui
# or
npx playwright test --ui
```

Opens the Playwright GUI with a test tree, live browser preview, and time-travel trace. Best for day-to-day development — you can watch each step execute and inspect the DOM at any point.

### Debug mode (headed, step-through)

```bash
npm run test:debug
```

Launches a headed browser with the Playwright Inspector paused at each action. Use this when a test is failing and you need to step through what's happening in the browser.

### Run a single spec or filter by name

```bash
npx playwright test tests/workspace.spec.ts
npx playwright test --grep "footer is visible"
```

### Run on a single browser only

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View the HTML report

```bash
npm run test:report
```

The report is automatically opened after a test run. You can also open the last run's report at any time with this command. It includes screenshots, videos (on failure), and trace files you can open in the Playwright trace viewer.

---

## VS Code Extension & Debugger

The `.vscode/extensions.json` in this folder already recommends the official **Playwright Test for VS Code** extension (`ms-playwright.playwright`). Accept the prompt when opening the repo, or install it manually from the Extensions sidebar.

### What the extension gives you

- **Test Explorer** — a sidebar panel listing every `test()` and `test.describe()` block. Click the run button next to any test or group to run just that one.
- **Breakpoint debugging** — set a breakpoint in any `.spec.ts` file, then click the debug icon (bug icon) next to a test in Test Explorer. Playwright runs headed and pauses at your breakpoint, with the full VS Code debugger (call stack, variable inspection, watch expressions).
- **Pick locator** — open a browser from Test Explorer, hover over any element, and the extension suggests the best Playwright locator for it. Clicking copies it to your clipboard.
- **Record new test** — "Record at cursor" in Test Explorer generates `page.goto` / `page.click` / `page.fill` calls directly into your open editor file. Use this to scaffold a new test, then refine the generated code with the patterns described below.
- **Trace viewer** — right-click a failed test in Test Explorer and choose "Show trace viewer" to inspect the full step waterfall, network requests, and screenshots without leaving VS Code.

### VS Code settings tip

If the Test Explorer runner doesn't pick up `ASPNETCORE_ENVIRONMENT=Development` automatically, add this to your `.vscode/settings.json`:

```json
{
  "playwright.env": {
    "ASPNETCORE_ENVIRONMENT": "Development"
  }
}
```

The `webServer` block in `playwright.config.ts` already injects this variable when starting `dotnet run`, but the VS Code extension has its own process management.

---

## Code Structure

```
ContentLock.Playwright.Tests/
├── playwright.config.ts              # All Playwright config (ports, browsers, webServer, auth)
├── package.json                      # npm scripts & dependencies
├── code/
│   ├── base.ts                       # Custom test fixture (extends Umbraco base)
│   ├── api.ts                        # Custom API helper (extends Umbraco ApiHelpers)
│   └── PageObjectModels/
│       └── Dashboard.ts              # Page Object Model for the ContentLock dashboard
└── tests/
    ├── auth.setup.ts                 # Auth setup: primary user (warren@hackmakedo.com)
    ├── auth.restricted-user.setup.ts # Auth setup: restricted editor (restricted@hackmakedo.com)
    ├── workspace.spec.ts             # Tests: workspace footer app, entity action visibility
    └── dashboard.spec.ts             # Tests: dashboard tab, lock counts, bulk unlock
```

### `code/base.ts` — The custom fixture

All tests import `{ test }` from `../code/base` rather than directly from `@playwright/test` or `@umbraco/playwright-testhelpers`. This file extends the Umbraco base fixture to inject two additional fixtures into every test:

- **`dashboard`** — a `Dashboard` POM instance (see below), ready to use without any setup
- **`umbracoApi`** — the custom `Api` class (see below), which extends Umbraco's built-in `ApiHelpers`

`base.ts` is the right place to add further fixtures as the test suite grows. For example, if you wanted a `workspaceFooter` POM available in every test, you would add it here alongside `dashboard`.

### `code/api.ts` — Extending the API helper

`Api` extends Umbraco's `ApiHelpers`, which provides things like content CRUD and user management via the Umbraco management API. ContentLock adds one method:

**`resetContentLocks()`** — calls `GET /umbraco/contentlock-e2e/api/reset`. This hits the `ContentLock.E2E` companion project's `TestController`, which deletes all rows from the `ContentLocks` database table and broadcasts `RemoveAllLocksToClients` via SignalR to all connected backoffice clients. It is called in `beforeEach` in every spec to guarantee a clean slate before each test.

To add more ContentLock-specific API interactions (for example, directly locking a node via the API as a test setup shortcut instead of clicking through the UI), add methods to this class. For Umbraco management API calls (creating content nodes, managing users, etc.), check whether `ApiHelpers` from `@umbraco/playwright-testhelpers` already provides what you need before writing new methods here.

### `code/PageObjectModels/Dashboard.ts` — Dashboard POM

Encapsulates locators and actions for the ContentLock dashboard tab. Locators use `data-testid` attributes (matched via the `testIdAttribute: 'data-mark'` config in `playwright.config.ts`), role selectors, and visible text.

| Method | What it does |
|--------|-------------|
| `goto()` | Navigates to the Content section, then clicks the "Content Lock" tab |
| `showsNumberOfLocks(n)` | Asserts the lock count element is visible and displays `n` |

As the test suite grows, add new POM files to `code/PageObjectModels/` for other ContentLock UI areas (e.g. `WorkspaceFooter.ts`, `EntityActions.ts`). Register them as fixtures in `code/base.ts` so specs receive them automatically.

---

## Test Users

| User | Email | Password | Groups | Purpose |
|------|-------|----------|--------|---------|
| Primary (admin) | `warren@hackmakedo.com` | `password1234` | Administrators | Default test user; can lock, unlock, and bulk-unlock |
| Restricted editor | `restricted@hackmakedo.com` | `password1234` | Editors only | Tests that users without the `ContentLock.Unlocker` granular permission cannot unlock other users' locks |

Both users are created automatically on first boot:

- `warren@hackmakedo.com` is created by the unattended install configured in `ContentLock.Website/appsettings.Development.json`
- `restricted@hackmakedo.com` is created by the `ContentLock.E2E` migration (`AddRestrictedTestUser`), which runs as part of the package migration plan on startup

Auth storage state (session cookies) for each user is saved to `playwright/.auth/user.json` and `playwright/.auth/restricted-user.json` by the two auth setup projects. These files are gitignored and regenerated automatically when missing.

---

## Writing New Tests

### 1. Import the custom `test`, not Playwright's directly

```ts
import { test } from '../code/base';
import { expect } from '@playwright/test';
import { ConstantHelper } from '@umbraco/playwright-testhelpers';
```

### 2. Choose the correct auth file

```ts
import * as path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
// or for permission-denied scenarios:
// const authFile = path.join(__dirname, '../playwright/.auth/restricted-user.json');

test.use({
    storageState: authFile,
    viewport: { width: 1920, height: 1080 },
});
```

The 1920×1080 viewport is important — some dashboard elements are hidden at smaller breakpoints.

### 3. Reset locks in `beforeEach`

```ts
test.beforeEach(async ({ page, umbracoUi, umbracoApi }) => {
    await page.goto('/umbraco');
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
    await umbracoApi.resetContentLocks();
});
```

### 4. Wait for API responses, not arbitrary timeouts

Intercept the lock/unlock HTTP response to know exactly when the operation completes, and to extract the content key without a separate API call:

```ts
const lockResponsePromise = page.waitForResponse(
    r => r.url().includes('/umbraco/contentlock/api/v1/Lock/') && r.status() === 200
);
await page.getByTestId('entity-action:contentlock.entityaction.document.lock').click();
const lockData = await (await lockResponsePromise).json();
const contentKey = lockData.key as string;
```

This is more reliable than `page.waitForTimeout()` because it responds to actual network completion rather than an arbitrary delay.

### 5. Multi-user scenarios

Use `browser.newContext()` with a separate `storageState` to open a second authenticated session. Always close the context in a `try/finally`:

```ts
const restrictedCtx = await browser.newContext({
    storageState: restrictedAuthFile,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
});
const restrictedPage = await restrictedCtx.newPage();

try {
    await restrictedPage.goto('/umbraco');
    await restrictedPage.waitForLoadState('networkidle');
    // ... assertions ...
} finally {
    await restrictedCtx.close();
}
```

When asserting state that depends on a SignalR broadcast (e.g. a lock created by user A appearing for user B), allow extra timeout (15 000 ms) for the event to be delivered over the websocket connection.

### 6. Use the dashboard as a SignalR sync point

Entity action conditions are evaluated when the actions menu is opened. If SignalR hasn't yet delivered the `AddLockToClients` event, the conditions still show the pre-lock state. Navigate to the ContentLock dashboard and assert the expected lock count before reopening the entity actions menu — the dashboard observable state confirms the event has been received:

```ts
await dashboard.goto();
await dashboard.showsNumberOfLocks(1);

await umbracoUi.content.goToSection(ConstantHelper.sections.content);
await umbracoUi.content.clickActionsMenuForContent('Home');
// Now safe to assert lock/unlock action visibility
```

### 7. Locator strategy

- **Prefer `getByTestId()`** — backed by `data-mark` attributes on Umbraco UI components (configured via `testIdAttribute: 'data-mark'` in `playwright.config.ts`). These are stable across Umbraco versions.
- **Use `getByRole()`** for standard HTML elements (buttons, tabs, rows, checkboxes).
- **Avoid CSS class selectors** on Umbraco web components — class names can change between Umbraco versions and are not part of the public API.

### 8. Generate a starting skeleton with codegen

```bash
npm run test:codegen
```

Or use the "Record at cursor" button in the VS Code Test Explorer. Codegen records clicks, fills, and navigations into your file. Refine the generated code using `waitForResponse`, proper auth setup, and the `beforeEach` reset pattern above.

---

## Why Tests Run Serially (`workers: 1`)

All tests share the same running Umbraco site and operate on the same content nodes (e.g. the "Home" node). Running tests in parallel would cause lock conflicts: if two tests both try to lock "Home" at the same time, one gets HTTP 400 from the Lock API, causing any `waitForResponse(status === 200)` to time out. Setting `workers: 1` eliminates this class of flakiness with no other changes needed.

---

## E2E Backend Companion Project (`ContentLock.E2E`)

`ContentLock.E2E` is a C# class library referenced by `ContentLock.Website` in the Development environment only. It is **not** included in the NuGet package shipped to users. It provides:

- **`TestController`** — exposes `GET /umbraco/contentlock-e2e/api/reset` (anonymous, ignores HTTPS errors). Clears all rows from the `ContentLocks` database table and broadcasts `RemoveAllLocksToClients` via SignalR to all connected backoffice clients. Called by `umbracoApi.resetContentLocks()` in every `beforeEach`.
- **E2E migrations** — `AddTestUsers` and `AddRestrictedTestUser` create the two test user accounts in the Umbraco database on first boot.

---

## CI Differences (GitHub Actions)

| Setting | Local | CI |
|---------|-------|----|
| Browsers | Chromium, Firefox, WebKit | Chromium only |
| `reuseExistingServer` | `true` (reuse if port 5002 responds) | `false` (always starts fresh) |
| Retries | 0 | 2 |
| Reporter | HTML | GitHub annotations + HTML |
| Boot timeout | 300 s | 300 s |
| Artefacts | Local `playwright-report/` | Uploaded to GitHub Actions (30-day retention) |

The first CI run takes up to 5 minutes because Umbraco performs an unattended install (creating the SQLite database, running all migrations, and creating the test users) before it reaches `RuntimeLevel.Run` and the health probe returns 200.
