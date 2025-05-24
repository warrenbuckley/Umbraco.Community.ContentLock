# Umbraco Community ContentLock

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NuGet version](https://img.shields.io/nuget/v/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)

**Umbraco Community ContentLock** is an open-source package for [Umbraco CMS](https://umbraco.com/) that prevents content conflicts by enabling content editors to lock nodes while editing. This ensures that changes are made by a single user at a time, reducing the risk of overwriting each other’s work.

## Features

- **Intuitive Lock/Unlock Actions:**  
  - Lock or unlock content nodes directly from the node actions (top right) or the tree view.
  
- **Comprehensive Audit Trail:**  
  - Every lock and unlock action is logged in the node history for complete traceability.
  
- **Enhanced Permission Management:**  
  - Introduces new permissions that allow users to override locks when needed
  - New permission is added to the Administrators user group when first installed
  
- **Dashboard Overview:**  
  - Access a dedicated dashboard in the content section to view all currently locked nodes.
  - Users with permission can override one or more locked nodes from this dashboard
  
- **User Notifications:**  
  - Users are informed via a footer message when a node is locked.
  
- **Read-Only Mode for Locked Nodes:**  
  - Locked nodes display all content (across all variants) as read-only.
  
- **Action Restrictions:**  
  - Prevents actions like publish, unpublish, and save for nodes that are currently locked.

## Options
Content Lock has the following options available to configure. 

| Setting | Description | Default Value |
| -- | -- | -- |
| SignalRClientLogLevel | The SignalR log level of printing messages to the browser console can be set as one of the following values. `Trace`, `Debug`, `Information` or `Info`, `Warning` or `Warn`, `Error`, `Critical` and `None` | `"Info"` |
| OnlineUsers.Enable | A boolean flag to decide if to displays a header app in the top right with the number of active users connected to the Umbraco backoffice | true
| OnlineUsers.Sounds.Enable | A boolean flag to decide if to play audio notifications when a user logs in or out of the backoffice | true
| OnlineUsers.Sounds.LoginSound | A path to an audio file that a browser can play when a new user logins to the Umbraco backoffice | `"/App_Plugins/ContentLock/sounds/login.mp3"`
| OnlineUsers.Sounds.LogoutSound | A path to an audio file that a browser can play when a user logs out of the Umbraco backoffice | `"/App_Plugins/ContentLock/sounds/logout.mp3"`

### AppSettings

```json
...
"ContentLock": {
  "SignalRClientLogLevel": "Info",
  "OnlineUsers": {
    "Enable": true,
    "Sounds": {
      "Enable": true,
      "LoginSound":"/App_Plugins/ContentLock/sounds/login.mp3",
      "LogoutSound":"/App_Plugins/ContentLock/sounds/logout.mp3"
    }
  }
}
```

### Environment Variables
```
ContentLock__SignalRClientLogLevel=Info
ContentLock__OnlineUsers__Enable=true
ContentLock__OnlineUsers__Sounds__Enable=true
ContentLock__OnlineUsers__Sounds__LoginSound=https://some-snazzy-sound.com/sfx-login.mp3
ContentLock__OnlineUsers__Sounds__LogoutSound=/App_Plugins/SomePlace/logout.mp3
```

### Reactive Options

> [!TIP]
> Changing any of these options will be changed **instantly** without having to redeploy or restart the application.

For example you could change the value **OnlineUsers.Enable** and this will instantly toggle the number of connected users in the backoffice in the top right of Umbraco.
You can see this in action here and [how it was coded](https://blog.hackmakedo.com/2025/04/28/using-signalr-ioptionsmonitor-with-umbraco-bellissima-for-reactive-net-options/) if you are curious:

[![How to use SignalR with Umbraco for real-time options](https://img.youtube.com/vi/MZfeUKSO8h4/0.jpg)](https://www.youtube.com/watch?v=MZfeUKSO8h4)

---

## Testing

This project includes C# unit tests, client-side (TypeScript/JavaScript) unit tests, and Playwright End-to-End (E2E) tests.

### C# Unit Tests

These tests cover the backend C# logic of the ContentLock plugin.

1.  **Navigate to the test project directory:**
    ```bash
    cd ContentLock.Tests.Unit
    ```
2.  **Run the tests:**
    ```bash
    dotnet test
    ```

### Client-Side Unit Tests

These tests cover the frontend TypeScript logic located in `ContentLock/Client/`. They use Vitest.

1.  **Navigate to the client project directory:**
    ```bash
    cd ContentLock/Client
    ```
2.  **Install dependencies (if you haven't already):**
    ```bash
    npm install
    ```
3.  **Run the tests:**
    *   To run tests in the console:
        ```bash
        npm test
        ```
    *   To run tests with the Vitest UI (opens in a browser):
        ```bash
        npm run test:ui
        ```

### Playwright End-to-End (E2E) Tests

These tests simulate user interactions in a browser to test the full functionality of the ContentLock plugin within an Umbraco environment.

1.  **Navigate to the E2E test project directory:**
    ```bash
    cd ContentLock.Tests.E2E
    ```
2.  **Install dependencies (if you haven't already):**
    ```bash
    npm install
    ```
    *Note: The first time you install, Playwright will also download browser binaries. You can also run `npx playwright install --with-deps` manually if needed.*

3.  **Prerequisites for Running E2E Tests:**
    *   **Running Umbraco Instance:** A compatible Umbraco website (like the provided `ContentLock.Website` example project) must be running and accessible at the `baseURL` configured in `playwright.config.ts` (default: `http://localhost:44391`).
    *   **Umbraco Credentials:** Valid Umbraco backoffice administrator credentials are required. These can be provided via:
        *   Environment variables: `UMBRACO_USER` and `UMBRACO_PASS`.
        *   By updating the default credentials directly in `ContentLock.Tests.E2E/tests/auth.setup.ts` (not recommended for shared environments).

4.  **Run the E2E tests:**
    *   To run tests headlessly:
        ```bash
        npm test 
        ```
        (or `npx playwright test`)
    *   To run tests with a headed browser (visible UI):
        ```bash
        npm run test:headed
        ```
    *   To run tests with the Playwright UI mode:
        ```bash
        npm run test:ui
        ```
    *   To view the HTML report after a test run:
        ```bash
        npm run report
        ```
        (or `npx playwright show-report`)

### CI/CD Considerations

*   **Unit Tests (C# and Client-Side):** Both sets of unit tests are fast and self-contained. They are ideal candidates for execution on every commit or pull request in a CI/CD pipeline (e.g., using GitHub Actions, Azure DevOps, Jenkins).
*   **Playwright E2E Tests:**
    *   E2E tests provide the highest confidence but are slower and require a more complex setup in CI.
    *   To run them in CI, the pipeline would need to:
        1.  Build and serve the Umbraco application (`ContentLock.Website` or a similar test site). This might involve Docker or directly running the .NET application.
        2.  Manage Umbraco test credentials securely (e.g., using CI secrets).
        3.  Ensure browser dependencies are available on the CI agent (Playwright's `--with-deps` flag helps here).
    *   Due to their execution time, E2E tests might be run on a schedule (e.g., nightly) or as a gate before merging to a main branch, rather than on every single commit to feature branches.

---

### Attributions
* Log on sound: Piano Notification 3 by FoolBoyMedia
  * https://freesound.org/s/352651/
  * License: Attribution NonCommercial 4.0
* Log off sound: Dist Kalimba.wav by JFRecords
  * https://freesound.org/s/420521/
  * License: Attribution 3.0

---

### Fork Notice
This package is a community-driven fork of the original [CogWorks ContentGuard](https://github.com/thecogworks/Cogworks.ContentGuard) project, modified for the modern Umbraco Bellissima backoffice. Special thanks to the team at CogWorks and the original developer [Marcin Zajkowski](https://github.com/mzajkowski) for laying the groundwork and supporting this update.

---

_Lovingly crafted for you by [Warren Buckley](https://github.com/sponsors/warrenbuckley) ❤️_

_[Available for hire](https://hackmakedo.com/)_
