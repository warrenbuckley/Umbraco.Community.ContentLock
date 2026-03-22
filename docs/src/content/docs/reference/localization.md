---
title: Localization
description: Supported languages and i18n key reference for ContentLock.
---

ContentLock ships with translations for 8 languages. All language files live in `ContentLock/Client/src/localizations/`.

---

## Supported Languages

| Language | Code | File |
|---|---|---|
| English | `en` | `en.ts` |
| Welsh | `cy` | `cy.ts` |
| Danish | `dk` | `dk.ts` |
| French | `fr` | `fr.ts` |
| Italian | `it` | `it.ts` |
| Dutch | `nl` | `nl.ts` |
| Norwegian | `no` | `no.ts` |
| Turkish | `tr` | `tr.ts` |

The English file (`en.ts`) is the source of truth. All other language files must contain the same keys.

---

## Translation Key Reference

### `contentLockDashboard`

Dashboard labels and table headers.

| Key | English Value |
|---|---|
| `label` | `Content Lock` |
| `pageNameHeader` | `Page Name` |
| `contentTypeHeader` | `Content Type` |
| `checkedOutByHeader` | `Checked Out By` |
| `checkedOutAtHeader` | `Checked Out At` |
| `lastEditedHeader` | `Last Edited` |
| `unlockAction` | `Unlock` |
| `pagesCheckedOutTitle` | `Pages Checked Out` |
| `noLocks` | `No locks` |
| `noLocksMessage` | `🎉 Zip, zero, nada` |

### `contentLockFooterApp`

Workspace footer banner text.

| Key | English Value |
|---|---|
| `lockedByYou` | `This page is locked by you` |
| `lockedByAnother` | `This page is locked by {0}` |

### `contentLockNotification`

Toast notification messages.

| Key | English Value |
|---|---|
| `lockedHeader` | `Content Locked` |
| `lockedMessage` | `The document has been locked for you to edit.` |
| `unlockedHeader` | `Content Unlocked` |
| `unlockedMessage` | `The document has been unlocked, to allow other users to edit.` |
| `bulkUnlockHeader` | `Content Unlocked` |
| `bulkUnlockMessage` | `The selected content has been unlocked successfully` |

### `contentLockPermission`

Permission labels shown in the User Groups permissions UI.

| Key | English Value |
|---|---|
| `group` | `Content Lock` |
| `label` | `Unlocker` |
| `description` | `Allows the group of users to unlock a document that is locked by another user.` |

### `contentLockUsersModal`

Online users modal.

| Key | English Value |
|---|---|
| `modalHeader` | `Who's online?` |
| `listOfUsers` | `Online Users` |
| `youLabel` | `You` |

### `contentUnlockedModal`

Modal shown when a lock is released while you're viewing the node.

| Key | English Value |
|---|---|
| `modalHeader` | `Content Unlocked` |
| `modalContent` | `The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version` |
| `reload` | `Reload` |

### `actionCategories`

Action menu category label.

| Key | English Value |
|---|---|
| `contentLock` | `Content Lock` |

### `contentLockCall`

Audio calling UI strings.

| Key | English Value |
|---|---|
| `callButton` | `Call` |
| `busyIndicator` | `On a call` |
| `incoming` | `Incoming call` |
| `accept` | `Accept` |
| `decline` | `Decline` |
| `hangUp` | `Hang Up` |
| `mute` | `Mute` |
| `unmute` | `Unmute` |
| `deviceSettings` | `Audio devices` |
| `microphone` | `Microphone` |
| `speaker` | `Speaker` |
| `callEnded` | `Call ended` |
| `callDeclined` | `{0} declined the call` |
| `callBusy` | `{0} is currently on another call` |
| `callFailed` | `Call failed to connect` |
| `calling` | `Calling` |
| `missedCall` | `Missed call` |
| `missedCallFrom` | `{0} tried to call you` |

---

## Contributing Translations

To add or improve a translation:

1. Open the relevant language file in `ContentLock/Client/src/localizations/` (e.g., `fr.ts` for French).
2. Ensure all keys from `en.ts` are present.
3. Translate each value. Do not translate keys — only values.
4. For interpolated strings (e.g., `{0}`), keep the placeholder in the translated value.
5. Submit a pull request with your changes.

When adding a new translation key to the package:

1. Add the key and English value to `en.ts`.
2. Add the key (with a translated value or the English fallback) to **all 7 other language files**.
