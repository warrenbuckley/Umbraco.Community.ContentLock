---
title: Auto Lock Configuration
description: Enable and tune automatic content locking on edit.
---

The `AutoLock` configuration section controls whether nodes are automatically locked when an editor starts changing them, and how long an idle lock is kept before it is released. See the [Auto Lock feature](/features/auto-lock/) for an overview of the behaviour.

Auto Lock is **disabled by default**.

---

## Configuration

```json
{
  "ContentLock": {
    "AutoLock": {
      "Enable": true,
      "InactivityTimeoutSeconds": 300,
      "HeartbeatSeconds": 60
    }
  }
}
```

---

## Options

### `AutoLock.Enable`

**Type:** `bool` | **Default:** `false` | **Reactive:** ✅ Yes

Turns automatic locking on or off. When `true`, a node is locked automatically as soon as an editor makes their first change, and released on save / leaving the node / disconnect / inactivity timeout.

When `false` (the default), only the manual [Lock/Unlock actions](/features/content-locking/) are available.

This setting is **reactively applied** via SignalR — no server restart needed.

---

### `AutoLock.InactivityTimeoutSeconds`

**Type:** `int` | **Default:** `300` | **Reactive:** ✅ Yes

Seconds of editing inactivity after which an auto-lock is released server-side. The countdown resets every time the editor makes a change, so an actively edited node stays locked. Defaults to 5 minutes.

---

### `AutoLock.HeartbeatSeconds`

**Type:** `int` | **Default:** `60` | **Reactive:** ✅ Yes

How often the editor's browser refreshes its auto-lock while editing, keeping the server-side inactivity timer alive. This **should be less than `InactivityTimeoutSeconds`** — otherwise an actively edited lock could expire between heartbeats. Defaults to 1 minute.

---

## Reactive Behaviour

Like the other ContentLock options, `AutoLock` settings use `IOptionsMonitor<ContentLockOptions>` and are pushed to all connected clients via the `ReceiveLatestOptions` SignalR event when `appsettings.json` changes — no restart or page reload required.

---

## Environment Variables

```
ContentLock__AutoLock__Enable=true
ContentLock__AutoLock__InactivityTimeoutSeconds=300
ContentLock__AutoLock__HeartbeatSeconds=60
```
