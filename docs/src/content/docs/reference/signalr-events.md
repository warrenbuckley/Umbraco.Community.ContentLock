---
title: SignalR Events
description: Full reference of SignalR hub events broadcast from server to client.
---

ContentLock uses a SignalR hub (`ContentLockHub`) mounted at `/umbraco/ContentLockHub` to push real-time updates to all connected backoffice clients. All events are defined in the `IContentLockHubEvents` interface.

---

## Content Lock Events

| Event | When Sent | Payload |
|---|---|---|
| `ReceiveLatestContentLocks` | When a client first connects | `ContentLockOverviewItem[]` — full list of current locks |
| `AddLockToClients` | When any editor locks a node | `ContentLockOverviewItem` — the new lock |
| `RemoveLockToClients` | When a single node is unlocked | `Guid` — the content key of the unlocked node |
| `RemoveLocksToClients` | When bulk unlock is performed | `Guid[]` — the content keys of unlocked nodes |
| `RemoveAllLocksToClients` | E2E test cleanup only | *(no payload)* — instructs all clients to clear all locks |

---

## User Presence Events

| Event | When Sent | Payload |
|---|---|---|
| `ReceiveListOfConnectedUsers` | When a client first connects | `Guid[]` — keys of all currently connected users |
| `UserConnected` | When a new editor connects | `Guid` — the new user's key |
| `UserDisconnected` | When an editor disconnects (all tabs closed) | `Guid` — the disconnected user's key |

A user is only marked as disconnected when **all** of their SignalR connections are closed. Opening the same backoffice in multiple tabs counts as multiple connections for the same user.

---

## Options Events

| Event | When Sent | Payload |
|---|---|---|
| `ReceiveLatestOptions` | On client connect, or when `appsettings.json` changes | `ContentLockOptions` — the full current options object |

This event powers the reactive configuration system — when an admin updates `appsettings.json`, the new settings are pushed to every connected client without a restart.

---

## WebRTC / Audio Calling Events

These events handle WebRTC signalling between peers (offer/answer/ICE) and call lifecycle notifications.

| Event | When Sent | Payload |
|---|---|---|
| `ReceiveCallOffer` | Sent to a specific user when another starts a call | `callerKey: Guid`, `callerName: string`, `sdpOffer: string` |
| `ReceiveCallAnswer` | Sent to the caller when the recipient accepts | `sdpAnswer: string` |
| `ReceiveIceCandidate` | Relayed between peers during connection setup | `candidate: string`, `sdpMid: string?`, `sdpMLineIndex: int?` |
| `CallDeclined` | Sent to the caller when the recipient declines | *(no payload)* |
| `CallEnded` | Sent to the remaining party when the other hangs up | *(no payload)* |
| `CallBusy` | Sent to the caller if the recipient is already in a call | *(no payload)* |
| `CallNoAnswer` | Sent to the caller when the ring timeout expires | *(no payload)* |
| `MissedCall` | Sent to the recipient when the ring timeout expires | `callerKey: Guid`, `callerName: string` |
| `ConnectedUsersInCallUpdated` | Broadcast to all clients when call participants change | `Guid[]` — keys of users currently in a call |

---

## Hub Details

| Property | Value |
|---|---|
| Hub class | `ContentLockHub` |
| Route | `/umbraco/ContentLockHub` |
| Client tracking | `ConcurrentDictionary<Guid, ConcurrentHashSet<string>>` (user key → connection IDs) |
| Auth | Requires Umbraco backoffice authentication |
