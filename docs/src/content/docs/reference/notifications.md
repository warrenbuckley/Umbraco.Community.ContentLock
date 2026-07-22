---
title: Notifications (Events)
description: Reference of INotification events published by ContentLock for content locking and audio calling.
---

ContentLock publishes standard Umbraco `INotification` events so you can react to lock/unlock and call activity using ordinary `INotificationHandler<T>` / `INotificationAsyncHandler<T>` handlers — no dependency on ContentLock beyond the notification types themselves.

---

## Content Lock Notifications

| Notification | Published From | Payload |
|---|---|---|
| `ContentLockedNotification` | `ContentLockService.LockContentAsync()`, after a lock is created | `LockItem: ContentLockOverviewItem` |
| `ContentUnlockedNotification` | `ContentLockService.UnlockContentAsync()`, after a lock is removed | `ContentKey: Guid`, `UnlockedByUserKey: Guid`, `UnlockedByUserName: string` |

---

## Call Notifications

These mirror the WebRTC call lifecycle already broadcast over SignalR (see [SignalR Events](/reference/signalr-events/)).

| Notification | Published From | Payload |
|---|---|---|
| `CallInitiatedNotification` | The hub routes a call offer to the callee | `CallerUserKey`, `CallerUserName`, `CalleeUserKey`, `CalleeUserName`, `Timestamp` |
| `CallDeclinedNotification` | The callee explicitly declines an incoming call | Same shape as above |
| `CallMissedNotification` | The ring times out unanswered | Same shape as above |
| `CallEndedNotification` | A call ends — either an explicit hang-up or a party disconnecting mid-call | Same shape as above |

---

## Registering a Handler

Handlers are registered the same way as any other Umbraco notification, in your own `IComposer`:

```csharp
using ContentLock.Notifications;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

public class MyContentLockNotificationsComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<ContentLockedNotification, MyContentLockedHandler>();
        builder.AddNotificationAsyncHandler<ContentUnlockedNotification, MyContentUnlockedHandler>();
    }
}

public class MyContentLockedHandler : INotificationAsyncHandler<ContentLockedNotification>
{
    public Task HandleAsync(ContentLockedNotification notification, CancellationToken cancellationToken)
    {
        // notification.LockItem.NodeName, .CheckedOutBy, .Key, etc.
        return Task.CompletedTask;
    }
}
```

A handler that throws is logged and swallowed by ContentLock — it will never prevent a lock, unlock, or call from completing normally.
