# Notification Events for ContentLock

**Issue:** [warrenbuckley/Umbraco.Community.ContentLock#113](https://github.com/warrenbuckley/Umbraco.Community.ContentLock/issues/113)
**Branch:** `feature/notifications-events`

## Context

ContentLock currently has no way for a developer to hook into lock/unlock or call
lifecycle events using standard Umbraco patterns. Anyone wanting to react to a
content lock (e.g. sync with an external PM tool, log analytics, post to Teams)
has no extension point at all.

This also lays the plumbing for a planned separate package,
`Umbraco.Community.ContentLock.Automate`, whose triggers need to listen to
`INotification` events on the Umbraco event aggregator — that package can't be
built until these notifications exist.

The fix: publish standard Umbraco `INotification` events from the existing
lock/unlock service and the WebRTC call-signalling hub, using Umbraco's built-in
`IEventAggregator`. This requires no new infrastructure — it's the same
notification pattern already consumed elsewhere in this codebase (e.g.
`ContentDeletingNotificationHandler` handles Umbraco's own
`ContentDeletingNotification`), just in the "publish" direction instead of
"handle".

## Notification Classes

All new files go in `ContentLock/Notifications/`. They follow the existing
codebase convention of a normal constructor + get-only properties (the GitHub
issue's examples use C# primary-constructor syntax, but no other class in this
repo uses that style, so these match the prevailing convention instead).

### `ContentLockedNotification`
Published after `ContentLockService.LockContentAsync()` succeeds.

```csharp
public sealed class ContentLockedNotification : INotification
{
    public ContentLockedNotification(ContentLockOverviewItem lockItem)
    {
        LockItem = lockItem;
    }

    public ContentLockOverviewItem LockItem { get; }
}
```

### `ContentUnlockedNotification`
Published after `ContentLockService.UnlockContentAsync()` succeeds.

```csharp
public sealed class ContentUnlockedNotification : INotification
{
    public ContentUnlockedNotification(Guid contentKey, Guid unlockedByUserKey, string unlockedByUserName)
    {
        ContentKey = contentKey;
        UnlockedByUserKey = unlockedByUserKey;
        UnlockedByUserName = unlockedByUserName;
    }

    public Guid ContentKey { get; }
    public Guid UnlockedByUserKey { get; }
    public string UnlockedByUserName { get; }
}
```

`UnlockedByUserKey`/`UnlockedByUserName` is the **acting** user (the one calling
`UnlockContentAsync`), not necessarily whoever originally created the lock — this
covers both self-unlock and an admin's bulk-unlock of someone else's lock.
`UnlockContentAsync` already receives this user's key as a parameter, so no extra
DB read of the lock row is needed (the GitHub issue suggested reading the row
first; that's unnecessary here).

### Call lifecycle notifications
Four notifications share one shape, one per call-lifecycle SignalR event already
emitted by `ContentLockHub`:

- `CallInitiatedNotification` — published from `SendCallOfferAsync`
- `CallDeclinedNotification` — published from `DeclineCallAsync`
- `CallMissedNotification` — published from `HandleRingTimeoutAsync` (the ring-timeout branch that fires `MissedCall`)
- `CallEndedNotification` — published from **both** `EndCallAsync` (explicit hang-up) and `CleanUpCallOnDisconnectAsync` (a party's connection drops mid-call) — both code paths already emit the same `CallEnded` SignalR event to the peer, so both also publish this notification

```csharp
public sealed class CallInitiatedNotification : INotification
{
    public CallInitiatedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
    {
        CallerUserKey = callerUserKey;
        CallerUserName = callerUserName;
        CalleeUserKey = calleeUserKey;
        CalleeUserName = calleeUserName;
        Timestamp = DateTime.UtcNow;
    }

    public Guid CallerUserKey { get; }
    public string CallerUserName { get; }
    public Guid CalleeUserKey { get; }
    public string CalleeUserName { get; }
    public DateTime Timestamp { get; }
}
```

`CallDeclinedNotification`, `CallMissedNotification`, `CallEndedNotification` are
identical in shape to `CallInitiatedNotification`.

## `ContentLockService.cs` Changes

- Inject `IEventAggregator` via the constructor.
- `LockContentAsync`: publish `ContentLockedNotification` immediately before
  `return lockInfo;` (the object is already fully built there).
- `UnlockContentAsync`: after the existing DB delete + audit log succeed, resolve
  the acting user's name via the already-injected `IUserService` (same pattern as
  `LockContentAsync`) and publish `ContentUnlockedNotification`.
- Every `PublishAsync` call is wrapped in its own try/catch that logs a warning
  and swallows the exception — see **Resilience** below.

## `ContentLockHub.cs` Changes

- Inject `IEventAggregator` and `IUserService`. `IUserService` is needed to
  resolve the display name of whichever party in a call is *not* the current
  SignalR connection (the hub only knows the current connection's identity via
  `Context.User`).
- **New static field**: `CallOriginator` — a
  `ConcurrentDictionary<Guid, Guid>` mapping each participant's user key to the
  *original caller's* key for their current call. `ActiveCalls` is bidirectional
  (`A→B` and `B→A`) so by itself it can't tell you who initiated the call once
  it's answered — but the notification shape needs that distinction (caller vs.
  callee) regardless of who ends the call.
  - Populated in `SendCallAnswerAsync`, alongside where `ActiveCalls` is
    populated: `CallOriginator[callerUserKey] = callerUserKey;` and
    `CallOriginator[calleeKey] = callerUserKey;`
  - Removed everywhere `ActiveCalls` entries are removed: in `EndCallAsync` and
    `CleanUpCallOnDisconnectAsync`.
- `SendCallOfferAsync` → after relaying the offer, resolve the callee's name via
  `IUserService` (caller's name is already known from `Context.User`) and publish
  `CallInitiatedNotification`.
- `DeclineCallAsync` → resolve the caller's name via `IUserService` (callee's
  name known from `Context.User`) and publish `CallDeclinedNotification`.
- `HandleRingTimeoutAsync` → resolve the callee's name via `IUserService`
  (caller's name is already a parameter) and publish `CallMissedNotification`.
- `EndCallAsync` / `CleanUpCallOnDisconnectAsync` → look up `CallOriginator` to
  determine caller vs. callee roles for the two known keys, resolve both names
  via `IUserService`, and publish `CallEndedNotification`.

## Resilience

Acceptance criteria on the issue require: *"Existing behaviour (SignalR
broadcasts, audit log entries) is unchanged — notifications are purely
additive."* A third-party `INotificationHandler` that throws must never break
the actual lock/unlock or call flow. Every `PublishAsync` call in both
`ContentLockService` and `ContentLockHub` is therefore wrapped:

```csharp
try
{
    await _eventAggregator.PublishAsync(new ContentLockedNotification(lockInfo), CancellationToken.None);
}
catch (Exception ex)
{
    _logger.LogWarning(ex, "A ContentLockedNotification handler threw an exception for content {contentKey}", contentKey);
}
```

This is the same shape in every publish site — log and continue, never rethrow.

## Testing

Following the existing NSubstitute + FluentAssertions pattern used in
`ContentLockApiControllerTests` and `ContentDeletingNotificationHandlerTests`:

- `ContentLockServiceTests` (new) — asserts `IEventAggregator.PublishAsync` is
  called with the expected notification payload after a successful lock and
  after a successful unlock, and that a throwing `IEventAggregator` does not
  prevent `LockContentAsync`/`UnlockContentAsync` from completing and returning
  normally.
- `ContentLockHubTests` (new — no hub test file exists yet) — one test per call
  notification asserting the right payload is published, plus a
  `CallOriginator` round-trip test (offer → answer → end, asserting the roles in
  `CallEndedNotification` are correct regardless of which party calls
  `EndCallAsync`), and a resilience test that a throwing `IEventAggregator`
  doesn't prevent the SignalR relay calls from happening.

## Documentation

New page: `docs/src/content/docs/reference/notifications.md`, mirroring the
existing `docs/src/content/docs/reference/signalr-events.md` table format (the
`reference/` directory sidebar is auto-generated by Starlight, so no sidebar
config change is needed). Contents:

- A table of the two content-lock notifications (when published, payload).
- A table of the four call notifications (when published, payload).
- A registration example (the `IComposer` + `builder.AddNotificationHandler<>()`
  snippet from the GitHub issue).

## Out of Scope

- No changes to `IContentLockService`/`IContentLockHubEvents` public interfaces
  — these notifications are additive, published internally.
- No new DI registration is required in any `Composer` — `IEventAggregator` and
  `IUserService` are core Umbraco services already available for constructor
  injection everywhere.
- No changes to existing SignalR event payloads or the DB schema.
