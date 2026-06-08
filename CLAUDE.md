# CLAUDE.md — Umbraco.Community.ContentLock

## Project Overview

**Umbraco Community ContentLock** is an open-source NuGet package for **Umbraco CMS 17** (Bellissima backoffice) that prevents content editing conflicts. Editors can lock a content node while editing; locked nodes become read-only for everyone else, and publish/save/unpublish actions are hidden for other users. Real-time lock state is pushed to all connected backoffice users via **SignalR**. An optional **Auto Lock** mode (opt-in) locks a node automatically when an editor first changes it, and releases it on save, leaving the node, disconnect, or after an inactivity timeout.

- NuGet package ID: `Umbraco.Community.ContentLock`
- Current version: `17.0.0`
- Target framework: `net10.0`
- Umbraco CMS dependency: `17.0.0`
- License: MIT

## Repository Structure

```
/
├── ContentLock/                  # Main package project (C# + TypeScript)
│   ├── Client/                   # TypeScript frontend (Vite, Lit web components)
│   │   ├── src/                  # Frontend source
│   │   │   ├── api/              # Auto-generated OpenAPI TypeScript client (hey-api)
│   │   │   ├── autoLock/         # Auto Lock workspace context (lock-on-edit + heartbeat)
│   │   │   ├── bundle.manifests.ts  # Root manifest bundle
│   │   │   ├── conditions/       # Umbraco extension conditions
│   │   │   ├── dashboards/       # Content Lock dashboard (overview of all locks)
│   │   │   ├── entityActions/    # Lock/Unlock entity actions in tree/actions menu
│   │   │   ├── entitySigns/      # Visual lock indicator on tree nodes
│   │   │   ├── entrypoints/      # Extension entry point (injects conditions into core actions)
│   │   │   ├── globalContexts/   # SignalR context (real-time state)
│   │   │   ├── headerApps/       # Online users count in backoffice header
│   │   │   ├── localizations/    # i18n translations (en, cy, dk, fr, it, nl, no, tr)
│   │   │   ├── modals/           # Online users modal
│   │   │   ├── userpermissions/  # "Unlocker" permission definition
│   │   │   ├── workspaceActions/ # "Preview Only" workspace action for locked nodes
│   │   │   ├── workspaceContexts/# Workspace-level lock context
│   │   │   └── workspaceFooterApp/ # Footer message when a node is locked
│   │   ├── package.json
│   │   └── vite.config.ts        # Builds to ../wwwroot/App_Plugins/ContentLock
│   ├── Composers/                # Umbraco IComposer DI registrations
│   ├── Controllers/              # ContentLockApiController (Lock/Unlock/BulkUnlock)
│   ├── Extensions/               # IUser extensions, UmbracoBuilder SignalR setup
│   ├── FlagProviders/            # IsLockedFlagProvider (adds lock flag to tree items)
│   ├── Interfaces/               # IContentLockService, IContentLockHubEvents
│   ├── Migrations/               # PackageMigrationPlan (DB table + admin permission)
│   ├── Models/                   # ContentLocks (DB model), ContentLockStatus/Overview
│   ├── Notifications/            # Handlers for ContentDeleting, ContentMovingToRecycleBin
│   ├── Options/                  # ContentLockOptions (IOptionsMonitor, appsettings)
│   ├── Services/                 # ContentLockService (core lock/unlock logic)
│   ├── SignalR/                  # ContentLockHub, ContentLockHubRoutes
│   └── wwwroot/App_Plugins/ContentLock/  # Compiled frontend output (do not edit manually)
├── ContentLock.Website/          # Umbraco test site for local development
├── ContentLock.E2E/              # E2E test project (.csproj)
├── ContentLock.Playwright.Tests/ # Playwright E2E tests (TypeScript)
├── build.ps1                     # PowerShell script to pack the NuGet package
├── appsettings-schema.umbraco.community.contentlock.json  # JSON schema for appsettings
└── Umbraco.Community.ContentLock.slnx  # Solution file
```

## Architecture

### Backend (C#)

- **`ContentLockService`** — Core service for lock/unlock/overview operations. Uses Umbraco's `IScopeProvider` / `NPoco` ORM to read/write the `ContentLocks` database table. Logs audit entries via `IAuditService`. `LockContentAsync` takes an `isAutoLock` flag, and `ReleaseAutoLockAsync` removes a lock only when it is an auto-lock held by that user (so manual locks are never auto-removed).
- **`ContentLockApiController`** — Versioned Umbraco backoffice API (`/umbraco/api/contentlock/v1/`). Endpoints: `GET Lock/{key}`, `GET Unlock/{key}`, `POST BulkUnlock`. After each operation, broadcasts the change via SignalR to all connected clients. The unlock endpoints also broadcast `ReceiveLockUnlockedByUser` so an auto-lock holder can be told who removed it.
- **`ContentLockHub`** — SignalR hub (route: `/umbraco/ContentLockHub`). Tracks connected users with a `ConcurrentDictionary<Guid, ConcurrentHashSet<string>>` (one user can have multiple tabs/connections). On connect, sends the caller the current lock list, connected user list, and current options. Uses `IOptionsMonitor` to reactively push option changes to all clients.
- **`ContentLockHub.AutoLock.cs`** (partial) — Auto Lock hub methods `AcquireAutoLock` / `ReleaseAutoLock` / `AutoLockHeartbeat`. Tracks auto-locks per connection so `OnDisconnectedAsync` releases them, and runs a per-lock in-memory inactivity timer (mirrors the WebRTC ring-timeout pattern) that releases the lock server-side; the heartbeat resets it.
- **`IsLockedFlagProvider`** — Implements `IFlagProvider` to attach a `Umbraco.ContentLock.Locked` flag to `DocumentTreeItemResponseModel`, `DocumentCollectionResponseModel`, and `DocumentItemResponseModel`. Used by the frontend to show visual lock indicators.
- **Notification Handlers** — `ContentDeletingNotificationHandler` and `ContentMovingToRecycleBinHandler` auto-unlock items when they are deleted or moved to the recycle bin (cancels the operation if a different user tries to delete a locked item).
- **`ContentLockMigrationPlan`** — `PackageMigrationPlan`: create the DB table, add the `ContentLock.Unlocker` permission to the Administrators user group, and add the `IsAutoLock` column to `ContentLocks` (distinguishes auto-locks from manual ones).
- **`ContentLockOptions`** — Bound to the `ContentLock` appsettings section. Supports reactive updates via `IOptionsMonitor`.

### Frontend (TypeScript / Lit / Umbraco Bellissima)

All frontend extensions are registered as Umbraco extension manifests (loaded from `umbraco-package.json` → `bundle.manifests.ts`):

- **Entry point** — On init, appends a `CanShowCommonActions` condition to core Umbraco actions (SaveAndPublish, Save, Publish, Unpublish, RecycleBin.Trash, Rollback, MoveTo, Delete, DuplicateTo) so they are hidden when a node is locked by someone else.
- **`ContentLockSignalrContext`** — Global Umbraco context that manages the SignalR connection. Maintains observable state for `contentLocks`, `connectedUserKeys`, and `contentLockOptions`. All UI components observe from this context.
- **Auto Lock workspace context** (`autoLock/`) — Per-document workspace context (opt-in via `AutoLock.Enable`). Observes the document workspace's `data` + `getHasUnpersistedChanges()` to acquire on first edit, sends a throttled heartbeat while editing, releases on save/leave, and shows a notification (naming the user) when another user removes the lock.
- **Conditions** — `ShowLock`, `ShowUnlock`, `ShowLockedStatus`, `ShowPreview`, `EnableOnlineUsers`, `CanShowCommonActions`
- **Dashboard** — Shows a table of all locked nodes with bulk unlock capability.
- **Header App** — Shows the number of other online backoffice users; clicking opens a modal listing them. Only shown when `OnlineUsers.Enable` is true.
- **Workspace Footer App** — Displays a banner on locked nodes showing who has the lock.
- **API client** — Auto-generated from the OpenAPI spec using `@hey-api/openapi-ts`. Located in `src/api/`. **Do not manually edit these files.**

## Development Workflow

### Prerequisites

- .NET 10 SDK
- Node.js (for the TypeScript client)
- PowerShell (for `build.ps1`)

### Running the Test Site

```bash
cd ContentLock.Website
dotnet run
```

The test site typically runs on `https://localhost:44378`.

### Building the Frontend

```bash
cd ContentLock/Client
npm install
npm run build        # One-time build
npm run watch        # Watch mode during development
```

The compiled output goes to `ContentLock/wwwroot/App_Plugins/ContentLock/`.

### Regenerating the OpenAPI TypeScript Client

The TypeScript API client is auto-generated from the live Umbraco OpenAPI spec. Requires the test site to be running:

```bash
cd ContentLock/Client
npm run generate-client
# Runs: node scripts/generate-openapi.js https://localhost:44378/umbraco/swagger/contentlock/swagger.json
```

The generated files in `src/api/` should then be committed. The `generate-client` script uses `@hey-api/openapi-ts`.

### Packing the NuGet Package

```bash
./build.ps1
```

This updates the version in `umbraco-package.json`, then runs `dotnet pack` outputting to `./build.out/`.

## Key Conventions

### C# Patterns

- All Composers implement `IComposer` and register services/handlers in `Compose(IUmbracoBuilder builder)`.
- Use `IScopeProvider` for all database access; scopes are created with `autoComplete: true` for reads.
- The `ContentLock` namespace is used throughout (not `Umbraco.Community.ContentLock`).
- The `IUserExtensions` class provides the `HasContentUnlockPermission()` helper that checks for the `ContentLock.Unlocker` granular permission.
- The `UmbracoBuilderExtensions` class lives in the `Umbraco.Extensions` namespace (same as Umbraco core) to aid extension method discovery.

### TypeScript Patterns

- All state is managed as **observables** via Umbraco's `UmbArrayState` / `UmbObjectState` in `ContentLockSignalrContext`. Components observe from this context rather than making direct API calls.
- SignalR events are handled exclusively in `ContentLockSignalrContext`; components should not subscribe to SignalR directly.
- The `@umbraco-cms/backoffice` package is externalized in Vite — it is provided at runtime by Umbraco, not bundled.
- Localization keys follow the pattern `contentLock<Area>.<key>` (e.g., `contentLockDashboard.label`).
- When adding a new translation key, add it to **all** language files in `src/localizations/` (en, cy, dk, fr, it, nl, no, tr).

### Real-Time Architecture

SignalR events (server → client):
| Event | When sent | Payload |
|---|---|---|
| `ReceiveLatestContentLocks` | On client connect | `ContentLockOverviewItem[]` |
| `AddLockToClients` | When a node is locked | `ContentLockOverviewItem` |
| `RemoveLockToClients` | When a single node is unlocked | `Guid` (content key) |
| `RemoveLocksToClients` | Bulk unlock | `Guid[]` |
| `ReceiveLockUnlockedByUser` | A user explicitly unlocks a node (sent before the removal) | `Guid` key, `string` name, `Guid` userKey |
| `RemoveAllLocksToClients` | E2E test cleanup only | (none) |
| `UserConnected` | New user connects | `Guid` (user key) |
| `UserDisconnected` | User disconnects (all tabs) | `Guid` (user key) |
| `ReceiveListOfConnectedUsers` | On client connect | `Guid[]` |
| `ReceiveLatestOptions` | On connect or options change | `ContentLockOptions` |

Auto Lock also uses three client → server hub methods: `AcquireAutoLock`, `ReleaseAutoLock`, `AutoLockHeartbeat`.

## Configuration (appsettings.json)

```json
"ContentLock": {
  "SignalRClientLogLevel": "Info",
  "AutoLock": {
    "Enable": false,
    "InactivityTimeoutSeconds": 300,
    "HeartbeatSeconds": 60
  },
  "OnlineUsers": {
    "Enable": true,
    "Sounds": {
      "Enable": true,
      "LoginSound": "/App_Plugins/ContentLock/sounds/login.mp3",
      "LogoutSound": "/App_Plugins/ContentLock/sounds/logout.mp3"
    }
  }
}
```

`OnlineUsers.Enable`, `OnlineUsers.Sounds.*`, and all `AutoLock.*` options are **reactively applied** without a restart (via `IOptionsMonitor` → SignalR push). `SignalRClientLogLevel` requires a page reload since the SignalR JS client is already initialized.

## Permissions

The `ContentLock.Unlocker` granular permission (`Constants.Permission`) allows a user to:
- Unlock a node locked by another user (single unlock)
- Perform bulk unlocks from the dashboard

This permission is automatically added to the **Administrators** user group on first install via the migration plan.

## i18n

Translations live in `ContentLock/Client/src/localizations/`. The English file (`en.ts`) is the source of truth. When adding new UI strings, update all language files. See `src/localizations/readme.md` for the full key reference table.

## E2E Tests

Playwright tests are in `ContentLock.Playwright.Tests/`. The `ContentLock.E2E` project is the C# companion. Tests use a special `RemoveAllLocksToClients` SignalR event for cleanup between test runs.
