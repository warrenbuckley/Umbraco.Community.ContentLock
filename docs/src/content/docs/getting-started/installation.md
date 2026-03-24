---
title: Installation
description: Install ContentLock via NuGet and run the first-time migration.
---

ContentLock is distributed as a NuGet package and requires **Umbraco CMS**.

---

## Install via NuGet CLI

```bash
dotnet add package Umbraco.Community.ContentLock
```

## Install via Package Manager Console (Visual Studio)

```powershell
Install-Package Umbraco.Community.ContentLock
```

---

## First-Run Migration

On the first startup after installing the package, Umbraco automatically runs the ContentLock migration plan (`ContentLockMigrationPlan`). This:

1. **Creates the `ContentLocks` database table** — stores active locks (content key, user key, timestamps).
2. **Adds the `ContentLock.Unlocker` permission** to the built-in **Administrators** user group.

No manual database changes or configuration is required.

---

## Confirming the Install

After restarting your Umbraco site:

1. Log in to the backoffice.
2. Open the **Content** section.
3. Right-click any content node in the tree — you should see a **Lock** action in the context menu.
4. Check for the **Content Lock** dashboard tab in the Content section header.

---

## Optional: Configure appsettings

ContentLock works out of the box with default settings. If you want to customise behaviour (disable online users, configure TURN servers for cross-network audio calls, etc.), add a `ContentLock` section to your `appsettings.json`:

```json
{
  "ContentLock": {
    "SignalRClientLogLevel": "Info",
    "OnlineUsers": {
      "Enable": true,
      "Sounds": {
        "Enable": true
      }
    },
    "WebRTC": {
      "Enable": true
    }
  }
}
```

See the [Configuration Overview](/configuration/overview/) for all available options.

---

## Next Steps

- [Quick Start](/getting-started/quick-start/) — lock your first node
- [Configuration Overview](/configuration/overview/) — full settings reference
