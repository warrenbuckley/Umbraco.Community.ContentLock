---
title: Unlocker Permission
description: The ContentLock.Unlocker granular permission and how to assign it.
---

ContentLock adds a single **granular permission** to Umbraco: `ContentLock.Unlocker`.

---

## What It Allows

Users with the Unlocker permission can:

- **Unlock a node locked by another user** — normally only the editor who applied the lock can unlock it. The Unlocker permission bypasses this restriction.
- **Perform bulk unlocks from the dashboard** — the Bulk Unlock button is only visible to users with this permission.

Without the Unlocker permission, an editor can only unlock nodes that they themselves locked.

---

## Default Assignment

The `ContentLock.Unlocker` permission is **automatically added to the Administrators user group** when ContentLock runs its first-time migration on install. Umbraco administrators have full unlock capabilities out of the box.

---

## Adding the Permission to Other Groups

To grant the Unlocker permission to another user group (e.g., a "Content Managers" group):

1. In the Umbraco backoffice, go to **Settings** → **Users** → **User Groups**.
2. Open the user group you want to edit.
3. Click the **Permissions** tab.
4. Scroll to the **Content Lock** section.
5. Tick the **Unlocker** checkbox.
6. Click **Save**.

All users in that group will immediately have the Unlocker permission.

---

## Permission Details

| Property | Value |
|---|---|
| Permission key | `ContentLock.Unlocker` |
| Permission group | `Content Lock` |
| Label | `Unlocker` |
| Description | *Allows the group of users to unlock a document that is locked by another user.* |
| Auto-assigned to | Administrators user group (on first install) |

---

## Checking the Permission Programmatically

ContentLock provides an extension method on `IUser` for checking this permission in C# code:

```csharp
bool canUnlock = user.HasContentUnlockPermission();
```

This helper is defined in `ContentLock.Extensions.IUserExtensions` and checks for the `ContentLock.Unlocker` granular permission constant.
