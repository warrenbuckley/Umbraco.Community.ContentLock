---
title: Introduction
description: What is ContentLock and why does it exist?
---

**Umbraco.Community.ContentLock** is an open-source NuGet package for **Umbraco CMS** that prevents content editing conflicts in multi-editor environments.

When multiple editors work in the same Umbraco backoffice, it is easy for one editor to overwrite another's unsaved changes. ContentLock solves this by letting editors explicitly lock a content node while they are editing it. Locked nodes become read-only for everyone else, and core actions (Save, Publish, Unpublish, etc.) are hidden until the node is unlocked.

:::note[Origin]
**ContentLock** is inspired by and a spiritual successor to [CogWorks ContentGuard](https://github.com/thecogworks/Cogworks.ContentGuard) for older Umbraco versions 8 & 9.
:::

---

## Feature Overview

### Content Locking

Editors lock a content node via the tree right-click menu or the top actions menu. Once locked:

- All content properties become read-only for other editors.
- Core actions (Save, Save and Publish, Publish, Unpublish, Trash, Move, Duplicate, Rollback, Delete) are hidden for other users.
- A visual lock icon appears on the node in the content tree.
- A footer banner shows who holds the lock.

### Real-Time Lock State

Lock and unlock events are broadcast to **all connected backoffice users** via SignalR the moment they happen — no page refresh needed. If you're looking at a node and another editor locks it, it becomes read-only **immediately**.

### Dashboard

The Content Lock dashboard (Content section → Content Lock tab) shows a table of all currently locked nodes with columns for Page Name, Content Type, Checked Out By, Checked Out At, and Last Edited. From here you can unlock individual nodes or bulk unlock several at once.

### Online Users

When enabled, a header app in the top bar shows how many other backoffice editors are currently active in the CMS. Clicking it opens a modal listing each user by name. Optional audio notifications play when editors connect or disconnect from the

### Audio Calling

Editors can start a peer-to-peer WebRTC audio call directly from the online users modal. No external conferencing service is required — most connections work without any server configuration. A TURN server (Cloudflare, Twilio, or Metered) can optionally be configured for environments with strict firewalls or NAT restrictions.

### Permissions

The `ContentLock.Unlocker` granular permission allows designated users (e.g., team leads) to unlock nodes that are locked by another editor. The permission is automatically granted to the Administrators user group on first install.

### Audit Trail

Every lock and unlock action is recorded in Umbraco's built-in audit log, visible in the node's Info tab under History.

---

## Supported Versions

| Package Version | Umbraco Version | .NET Version |
|---|---|---|
| 17.x.x | 17.x | net10.0 |
| 16.x.x | 16.x | net9.0 |
| 15.x.x | 15.x | net9.0 |

---

## Next Steps

- [Install ContentLock](/getting-started/installation/) via NuGet
- [Quick Start](/getting-started/quick-start/) — lock your first node in 3 steps
