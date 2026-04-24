---
title: Online Users Configuration
description: Configure the online users presence feature and sound notifications.
---

The `OnlineUsers` configuration section controls whether backoffice editors can see who else is online and whether audio notifications play on connect/disconnect events.

---

## Configuration

```json
{
  "ContentLock": {
    "OnlineUsers": {
      "Enable": true,
      "Sounds": {
        "Enable": true,
        "LoginSound": "/App_Plugins/ContentLock/sounds/login.mp3",
        "LogoutSound": "/App_Plugins/ContentLock/sounds/logout.mp3"
      }
    }
  }
}
```

---

## Options

### `OnlineUsers.Enable`

**Type:** `bool` | **Default:** `true` | **Reactive:** ✅ Yes

Controls whether the online users feature is active. When set to `false`:

- The user count indicator in the header is hidden.
- The "Who's online?" modal cannot be opened.
- Sound notifications do not play.
- The Call button for audio calls is also hidden (since it depends on online users being visible).

This setting is **reactively applied** — changing it in `appsettings.json` pushes the update to all connected backoffice sessions instantly via SignalR, without requiring a server restart.

---

### `OnlineUsers.Sounds.Enable`

**Type:** `bool` | **Default:** `true` | **Reactive:** ✅ Yes

Enables or disables audio notifications for editor presence events. When enabled:

- A **login sound** plays when a new editor connects to the backoffice.
- A **logout sound** plays when an editor disconnects.

Sounds play in the browser of each connected editor (not server-side). Each editor hears sounds for all other editors connecting/disconnecting.

---

### `OnlineUsers.Sounds.LoginSound`

**Type:** `string` | **Default:** `"/App_Plugins/ContentLock/sounds/login.mp3"` | **Reactive:** ✅ Yes

Path or URL to the audio file played when an editor connects. The default is a bundled MP3 file included with the package.

**Custom sound examples:**

```json
// Relative path (file served by your Umbraco site)
"LoginSound": "/media/sounds/my-login-sound.mp3"

// Absolute URL (external or CDN-hosted)
"LoginSound": "https://cdn.example.com/sounds/login.mp3"
```

---

### `OnlineUsers.Sounds.LogoutSound`

**Type:** `string` | **Default:** `"/App_Plugins/ContentLock/sounds/logout.mp3"` | **Reactive:** ✅ Yes

Path or URL to the audio file played when an editor disconnects. Follows the same format as `LoginSound`.

---

## Reactive Behaviour

All `OnlineUsers` settings use `IOptionsMonitor<ContentLockOptions>` under the hood. When you update `appsettings.json`:

1. .NET detects the file change.
2. The updated options are pushed to all connected SignalR clients via the `ReceiveLatestOptions` event.
3. Each backoffice session applies the new settings immediately.

No server restart or page reload is needed.

---

## Disabling Only Sounds

If you want to keep the user presence indicator but silence the audio notifications:

```json
{
  "ContentLock": {
    "OnlineUsers": {
      "Enable": true,
      "Sounds": {
        "Enable": false
      }
    }
  }
}
```
