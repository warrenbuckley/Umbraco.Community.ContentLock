# Umbraco Community ContentLock

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NuGet version](https://img.shields.io/nuget/v/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)
[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)
![Contributors](https://img.shields.io/github/contributors/warrenbuckley/Umbraco.Community.ContentLock)

**Umbraco Community ContentLock** is a real-time collaboration package for Umbraco that prevents content editing conflicts. Editors can lock a content node while editing — locked nodes become read-only for everyone else, with all publish, save, and unpublish actions hidden until the lock is released.

---

## Features

### Lock & Unlock Content
Lock or unlock content nodes directly from the node actions menu (top right) or the tree view. Locked nodes are immediately read-only for all other editors — no accidental overwrites.

### Auto Lock _(opt-in)_
Optionally lock a node **automatically** the moment an editor changes it — no manual step. The lock is released automatically on save, when leaving the node, on disconnect, or after a configurable inactivity timeout. If another user removes the lock while you're editing, you're notified who did it. Disabled by default; coexists with manual locking.

### Real-Time Updates
Lock state is broadcast instantly to all connected backoffice users via **SignalR**. When someone locks or unlocks a node, every editor sees it update in real time — no page refresh needed.

### Visual Lock Indicators
A lock icon appears on content tree nodes so editors can see at a glance which nodes are locked and by whom.

### Workspace Footer Banner
A clear banner is displayed at the bottom of any locked node, showing the name of the editor who has the lock.

### Dashboard Overview
A dedicated dashboard in the Content section lists all currently locked nodes. Administrators (and users with the Unlocker permission) can unlock any node — individually or in bulk — directly from the dashboard.

### Audit Trail
Every lock and unlock action is written to the Umbraco audit log for full traceability.

### Permission System
A `ContentLock.Unlocker` granular permission lets you designate specific users or groups who can override locks. The Administrators group is granted this permission automatically on installation.

### Online Users
A header app in the top-right corner shows how many other editors are currently logged into the backoffice. Clicking it opens a modal listing everyone who is online, with optional audio notifications when users join or leave.

### Audio Calling _(17.1.0+)_
Editors can start a peer-to-peer **WebRTC voice call** directly from the Online Users modal — no external meeting software required. Works out of the box for editors on the same network. TURN server support (Cloudflare, Twilio, Metered) is available for remote teams.

---

## Documentation

Full documentation is available at **[warrenbuckley.github.io/Umbraco.Community.ContentLock](https://warrenbuckley.github.io/Umbraco.Community.ContentLock/)**.

---

## Configuration

Most settings are **reactive** — changes apply instantly without an application restart.

| Setting | Description | Default |
| --- | --- | --- |
| `AutoLock.Enable` | Automatically lock a node when an editor first changes it | `false` |
| `AutoLock.InactivityTimeoutSeconds` | Seconds of inactivity before an auto-lock is released | `300` |
| `OnlineUsers.Enable` | Show the online users count in the backoffice header | `true` |
| `OnlineUsers.Sounds.Enable` | Play audio when editors join or leave | `true` |
| `WebRTC.Enable` | Enable peer-to-peer audio calling | `true` |
| `WebRTC.RingTimeoutSeconds` | Seconds before an unanswered call times out | `20` |
| `WebRTC.TurnServer.Provider` | TURN provider for cross-network calls (`None`, `Cloudflare`, `Twilio`, `Metered`) | `"None"` |

Full configuration reference and TURN server setup guides are available in the [documentation](https://warrenbuckley.github.io/Umbraco.Community.ContentLock/).

---

## Support & Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/warrenbuckley/Umbraco.Community.ContentLock/issues).

---

_Lovingly crafted for you by [Warren Buckley](https://github.com/sponsors/warrenbuckley) ❤️_

_[Available for hire](https://hackmakedo.com/)_
