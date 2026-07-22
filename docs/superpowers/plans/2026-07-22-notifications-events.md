# Notification Events for ContentLock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish standard Umbraco `INotification` events from `ContentLockService` (lock/unlock) and `ContentLockHub` (WebRTC call lifecycle) so developers can hook in with ordinary `INotificationHandler<T>`/`INotificationAsyncHandler<T>` handlers.

**Architecture:** Six new sealed `INotification` classes in `ContentLock/Notifications/`, published via Umbraco's built-in `IEventAggregator`. The actual "resolve names + build notification + publish" logic for each event is extracted into a small `internal` method on the class that owns it (`ContentLockService` or `ContentLockHub`) — this keeps each unit testable with only interface mocks (`IUserService`, `IEventAggregator`), with no need to mock NPoco/`IScope` database machinery or fabricate a SignalR `HubCallerContext`/`ClaimsPrincipal`. Every publish is wrapped in try/catch-and-log so a third-party handler can never break a lock, unlock, or call.

**Tech Stack:** .NET 10, Umbraco CMS 17 (`Umbraco.Cms.Core.Events.IEventAggregator`, `Umbraco.Cms.Core.Notifications.INotification`), xUnit + NSubstitute + FluentAssertions (existing test stack in `ContentLock.Tests`).

## Global Constraints

- Namespace for all new notification classes: `ContentLock.Notifications` (matches existing `ContentDeletingNotificationHandler`/`ContentMovingToRecycleBinHandler`).
- Every `IEventAggregator.PublishAsync` call must be wrapped in try/catch, logging a warning and continuing — never rethrow. This satisfies the spec's "notifications are purely additive" requirement.
- New cross-cutting methods that exist purely to be unit-tested without needing DB/SignalR context are `internal`, not `public` — they are implementation details, not part of the package's public API surface.
- No changes to `IContentLockService` or `IContentLockHubEvents` — those are the existing public contracts and are out of scope.
- Follow the existing test convention: `Substitute.For<T>()` (NSubstitute), `FluentAssertions`, one test class per production class, `[Fact]` methods named `MethodName_Scenario_ExpectedResult`.

---

### Task 1: `ContentLockedNotification` + publish it from `ContentLockService.LockContentAsync`

**Files:**
- Modify: `ContentLock/ContentLock.csproj` (add `InternalsVisibleTo` so tests can call `internal` methods)
- Create: `ContentLock/Notifications/ContentLockedNotification.cs`
- Modify: `ContentLock/Services/ContentLockService.cs` (constructor ~line 25-40, `LockContentAsync` ~line 124-175)
- Test: `ContentLock.Tests/Services/ContentLockServiceTests.cs`

**Interfaces:**
- Produces: `ContentLockedNotification(ContentLockOverviewItem lockItem)` with `LockItem` property; `ContentLockService.PublishContentLockedAsync(ContentLockOverviewItem lockItem) : Task` (internal); `ContentLockService` constructor now also takes `IEventAggregator eventAggregator`.

- [ ] **Step 1: Add `InternalsVisibleTo` to the main project**

In `ContentLock/ContentLock.csproj`, add a new `ItemGroup` (after the closing `</ItemGroup>` on line 38, before the `Content Remove` item group):

```xml
    <ItemGroup>
        <InternalsVisibleTo Include="ContentLock.Tests" />
    </ItemGroup>
```

- [ ] **Step 2: Write the failing test**

Create `ContentLock.Tests/Services/ContentLockServiceTests.cs`:

```csharp
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Notifications;
using ContentLock.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;
using Xunit;

namespace ContentLock.Tests.Services;

/// <summary>
/// Unit tests for <see cref="ContentLockService"/>'s notification-publishing behaviour.
/// These do not exercise the DB-backed lock/unlock logic (that requires the full
/// IScopeProvider/NPoco stack) — only the extracted `PublishXAsync` methods, which
/// depend solely on IUserService and IEventAggregator.
/// </summary>
public class ContentLockServiceTests
{
    private static (
        ContentLockService service,
        IEventAggregator eventAggregator,
        IUserService userService
    ) CreateService()
    {
        var logger = NullLogger<ContentLockService>.Instance;
        var scopeProvider = Substitute.For<IScopeProvider>();
        var userService = Substitute.For<IUserService>();
        var auditService = Substitute.For<IAuditService>();
        var userIdKeyResolver = Substitute.For<IUserIdKeyResolver>();
        var idKeyMap = Substitute.For<IIdKeyMap>();
        var entityService = Substitute.For<IEntityService>();
        var eventAggregator = Substitute.For<IEventAggregator>();

        var service = new ContentLockService(
            logger,
            scopeProvider,
            userService,
            auditService,
            userIdKeyResolver,
            idKeyMap,
            entityService,
            eventAggregator);

        return (service, eventAggregator, userService);
    }

    private static ContentLockOverviewItem CreateLockItem() => new()
    {
        Key = Guid.NewGuid(),
        NodeName = "Home",
        ContentType = "home",
        CheckedOutBy = "Some User",
        CheckedOutByKey = Guid.NewGuid(),
    };

    [Fact]
    public async Task PublishContentLockedAsync_PublishesNotificationWithLockItem()
    {
        var (service, eventAggregator, _) = CreateService();
        var lockItem = CreateLockItem();

        await service.PublishContentLockedAsync(lockItem);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<ContentLockedNotification>(n => n.LockItem == lockItem),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishContentLockedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (service, eventAggregator, _) = CreateService();
        eventAggregator
            .PublishAsync(Arg.Any<ContentLockedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await service.PublishContentLockedAsync(CreateLockItem());

        await act.Should().NotThrowAsync();
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockServiceTests"`
Expected: FAIL to compile — `ContentLockService` has no constructor taking 8 arguments, and no `PublishContentLockedAsync` method exists yet.

- [ ] **Step 4: Create the notification class**

Create `ContentLock/Notifications/ContentLockedNotification.cs`:

```csharp
using ContentLock.Models.Backoffice;

using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published after a content node has been successfully locked.
/// </summary>
public sealed class ContentLockedNotification : INotification
{
    public ContentLockedNotification(ContentLockOverviewItem lockItem)
    {
        LockItem = lockItem;
    }

    public ContentLockOverviewItem LockItem { get; }
}
```

- [ ] **Step 5: Update `ContentLockService` — inject `IEventAggregator` and add the publish method**

In `ContentLock/Services/ContentLockService.cs`, add a using at the top (alongside the existing usings):

```csharp
using ContentLock.Notifications;
using Umbraco.Cms.Core.Events;
```

Update the field list and constructor (replace lines 17-40):

```csharp
        private readonly ILogger<ContentLockService> _logger;
        private readonly IScopeProvider _scopeProvider;
        private readonly IUserService _userService;
        private readonly IAuditService _auditService;
        private readonly IUserIdKeyResolver _userIdKeyResolver;
        private readonly IIdKeyMap _idKeyMap;
        private readonly IEntityService _entityService;
        private readonly IEventAggregator _eventAggregator;

        public ContentLockService(ILogger<ContentLockService> logger,
            IScopeProvider scopeProvider,
            IUserService userService,
            IAuditService auditService,
            IUserIdKeyResolver userIdKeyResolver,
            IIdKeyMap idKeyMap,
            IEntityService entityService,
            IEventAggregator eventAggregator)
        {
            _logger = logger;
            _scopeProvider = scopeProvider;
            _userService = userService;
            _auditService = auditService;
            _userIdKeyResolver = userIdKeyResolver;
            _idKeyMap = idKeyMap;
            _entityService = entityService;
            _eventAggregator = eventAggregator;
        }

        /// <summary>
        /// Publishes <see cref="ContentLockedNotification"/>. Wrapped so a third-party
        /// handler that throws can never prevent a lock from succeeding.
        /// </summary>
        internal async Task PublishContentLockedAsync(ContentLockOverviewItem lockItem)
        {
            try
            {
                await _eventAggregator.PublishAsync(new ContentLockedNotification(lockItem), CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "A ContentLockedNotification handler threw an exception for content {contentKey}", lockItem.Key);
            }
        }
```

- [ ] **Step 6: Call it from `LockContentAsync`**

In `LockContentAsync`, find the end of the method:

```csharp
            var lockInfo = new ContentLockOverviewItem
            {
                Key = contentKey,
                NodeName = contentNode.Name ?? "Unknown",
                ContentType = contentNode.ContentTypeAlias,
                CheckedOutBy = userName,
                CheckedOutByKey = userKey,
                LastEdited = contentNode.UpdateDate,
                LockedAtDate = now
            };

            return lockInfo;
```

Replace with:

```csharp
            var lockInfo = new ContentLockOverviewItem
            {
                Key = contentKey,
                NodeName = contentNode.Name ?? "Unknown",
                ContentType = contentNode.ContentTypeAlias,
                CheckedOutBy = userName,
                CheckedOutByKey = userKey,
                LastEdited = contentNode.UpdateDate,
                LockedAtDate = now
            };

            await PublishContentLockedAsync(lockInfo);

            return lockInfo;
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockServiceTests"`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add ContentLock/ContentLock.csproj ContentLock/Notifications/ContentLockedNotification.cs ContentLock/Services/ContentLockService.cs ContentLock.Tests/Services/ContentLockServiceTests.cs
git commit -m "feat: publish ContentLockedNotification when content is locked"
```

---

### Task 2: `ContentUnlockedNotification` + publish it from `ContentLockService.UnlockContentAsync`

**Files:**
- Create: `ContentLock/Notifications/ContentUnlockedNotification.cs`
- Modify: `ContentLock/Services/ContentLockService.cs` (`UnlockContentAsync`, ~line 177-197)
- Test: `ContentLock.Tests/Services/ContentLockServiceTests.cs`

**Interfaces:**
- Consumes: `IUserService.GetAsync(Guid) : Task<IUser?>` (already injected in Task 1).
- Produces: `ContentUnlockedNotification(Guid contentKey, Guid unlockedByUserKey, string unlockedByUserName)`; `ContentLockService.PublishContentUnlockedAsync(Guid contentKey, Guid unlockedByUserKey) : Task` (internal).

- [ ] **Step 1: Write the failing tests**

Add to `ContentLock.Tests/Services/ContentLockServiceTests.cs` (inside the `ContentLockServiceTests` class):

```csharp
    [Fact]
    public async Task PublishContentUnlockedAsync_ResolvesUserNameAndPublishesNotification()
    {
        var (service, eventAggregator, userService) = CreateService();
        var contentKey = Guid.NewGuid();
        var userKey = Guid.NewGuid();

        var user = Substitute.For<IUser>();
        user.Name.Returns("Jane Editor");
        userService.GetAsync(userKey).Returns(user);

        await service.PublishContentUnlockedAsync(contentKey, userKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<ContentUnlockedNotification>(n =>
                n.ContentKey == contentKey &&
                n.UnlockedByUserKey == userKey &&
                n.UnlockedByUserName == "Jane Editor"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishContentUnlockedAsync_WhenUserNotFound_UsesUnknown()
    {
        var (service, eventAggregator, userService) = CreateService();
        var contentKey = Guid.NewGuid();
        var userKey = Guid.NewGuid();

        userService.GetAsync(userKey).Returns((IUser?)null);

        await service.PublishContentUnlockedAsync(contentKey, userKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<ContentUnlockedNotification>(n => n.UnlockedByUserName == "Unknown"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishContentUnlockedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (service, eventAggregator, userService) = CreateService();
        var contentKey = Guid.NewGuid();
        var userKey = Guid.NewGuid();

        userService.GetAsync(userKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<ContentUnlockedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await service.PublishContentUnlockedAsync(contentKey, userKey);

        await act.Should().NotThrowAsync();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockServiceTests"`
Expected: FAIL to compile — `ContentUnlockedNotification` and `PublishContentUnlockedAsync` don't exist yet.

- [ ] **Step 3: Create the notification class**

Create `ContentLock/Notifications/ContentUnlockedNotification.cs`:

```csharp
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published after a content node has been successfully unlocked.
/// </summary>
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

- [ ] **Step 4: Add `PublishContentUnlockedAsync` to `ContentLockService`**

Add this method to `ContentLock/Services/ContentLockService.cs`, directly below `PublishContentLockedAsync`:

```csharp
        /// <summary>
        /// Resolves the acting user's display name and publishes <see cref="ContentUnlockedNotification"/>.
        /// Wrapped so a third-party handler that throws can never prevent an unlock from succeeding.
        /// </summary>
        internal async Task PublishContentUnlockedAsync(Guid contentKey, Guid unlockedByUserKey)
        {
            var user = await _userService.GetAsync(unlockedByUserKey);
            var userName = user?.Name ?? "Unknown";

            try
            {
                await _eventAggregator.PublishAsync(
                    new ContentUnlockedNotification(contentKey, unlockedByUserKey, userName),
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "A ContentUnlockedNotification handler threw an exception for content {contentKey}", contentKey);
            }
        }
```

- [ ] **Step 5: Call it from `UnlockContentAsync`**

In `UnlockContentAsync`, the method currently ends with:

```csharp
                // Convert Key to old style int's to use with AuditService
                var contentNodeAsAnId = _idKeyMap.GetIdForKey(contentKey, UmbracoObjectTypes.Document).Result;
                await _auditService.AddAsync(AuditType.Custom, userKey, contentNodeAsAnId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Unlocked", "Page Unlocked");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking content {contentKey} for user {userKey}", contentKey, userKey);
                throw new ContentLockException($"Error unlocking content {contentKey} for user {userKey}", ex);
            }
        }
```

Add the publish call right after the try/catch block, before the closing brace of `UnlockContentAsync`:

```csharp
                // Convert Key to old style int's to use with AuditService
                var contentNodeAsAnId = _idKeyMap.GetIdForKey(contentKey, UmbracoObjectTypes.Document).Result;
                await _auditService.AddAsync(AuditType.Custom, userKey, contentNodeAsAnId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Unlocked", "Page Unlocked");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking content {contentKey} for user {userKey}", contentKey, userKey);
                throw new ContentLockException($"Error unlocking content {contentKey} for user {userKey}", ex);
            }

            await PublishContentUnlockedAsync(contentKey, userKey);
        }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockServiceTests"`
Expected: PASS (5 tests total)

- [ ] **Step 7: Commit**

```bash
git add ContentLock/Notifications/ContentUnlockedNotification.cs ContentLock/Services/ContentLockService.cs ContentLock.Tests/Services/ContentLockServiceTests.cs
git commit -m "feat: publish ContentUnlockedNotification when content is unlocked"
```

---

### Task 3: The four call-lifecycle notification classes

**Files:**
- Create: `ContentLock/Notifications/CallInitiatedNotification.cs`
- Create: `ContentLock/Notifications/CallDeclinedNotification.cs`
- Create: `ContentLock/Notifications/CallMissedNotification.cs`
- Create: `ContentLock/Notifications/CallEndedNotification.cs`
- Test: `ContentLock.Tests/Notifications/CallNotificationsTests.cs`

**Interfaces:**
- Produces: four classes, each with constructor `(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)` and properties `CallerUserKey`, `CallerUserName`, `CalleeUserKey`, `CalleeUserName`, `Timestamp` (all get-only). Task 4-7 construct and publish these.

- [ ] **Step 1: Write the failing tests**

Create `ContentLock.Tests/Notifications/CallNotificationsTests.cs`:

```csharp
using ContentLock.Notifications;
using FluentAssertions;
using Xunit;

namespace ContentLock.Tests.Notifications;

public class CallNotificationsTests
{
    [Fact]
    public void CallInitiatedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallInitiatedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
        notification.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void CallDeclinedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallDeclinedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }

    [Fact]
    public void CallMissedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallMissedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }

    [Fact]
    public void CallEndedNotification_SetsAllProperties()
    {
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var notification = new CallEndedNotification(callerKey, "Caller Name", calleeKey, "Callee Name");

        notification.CallerUserKey.Should().Be(callerKey);
        notification.CallerUserName.Should().Be("Caller Name");
        notification.CalleeUserKey.Should().Be(calleeKey);
        notification.CalleeUserName.Should().Be("Callee Name");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~CallNotificationsTests"`
Expected: FAIL to compile — none of the four classes exist yet.

- [ ] **Step 3: Create the four notification classes**

Create `ContentLock/Notifications/CallInitiatedNotification.cs`:

```csharp
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when the ContentLockHub routes a WebRTC call offer from one editor to another.
/// </summary>
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

Create `ContentLock/Notifications/CallDeclinedNotification.cs`:

```csharp
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when the callee explicitly declines an incoming WebRTC call.
/// </summary>
public sealed class CallDeclinedNotification : INotification
{
    public CallDeclinedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
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

Create `ContentLock/Notifications/CallMissedNotification.cs`:

```csharp
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when a WebRTC call rings out unanswered.
/// </summary>
public sealed class CallMissedNotification : INotification
{
    public CallMissedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
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

Create `ContentLock/Notifications/CallEndedNotification.cs`:

```csharp
using Umbraco.Cms.Core.Notifications;

namespace ContentLock.Notifications;

/// <summary>
/// Published when a connected WebRTC call ends — either an explicit hang-up or a party disconnecting mid-call.
/// </summary>
public sealed class CallEndedNotification : INotification
{
    public CallEndedNotification(Guid callerUserKey, string callerUserName, Guid calleeUserKey, string calleeUserName)
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~CallNotificationsTests"`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add ContentLock/Notifications/CallInitiatedNotification.cs ContentLock/Notifications/CallDeclinedNotification.cs ContentLock/Notifications/CallMissedNotification.cs ContentLock/Notifications/CallEndedNotification.cs ContentLock.Tests/Notifications/CallNotificationsTests.cs
git commit -m "feat: add call lifecycle notification classes"
```

---

### Task 4: Wire up `ContentLockHub` DI + publish `CallInitiatedNotification`

**Files:**
- Modify: `ContentLock/SignalR/ContentLockHub.cs` (constructor ~line 35-44, `SendCallOfferAsync` ~line 92-128)
- Test: `ContentLock.Tests/SignalR/ContentLockHubTests.cs`

**Interfaces:**
- Consumes: `IUserService.GetAsync(Guid) : Task<IUser?>`, `IEventAggregator.PublishAsync<T>(T, CancellationToken) : Task`, `CallInitiatedNotification` (Task 3).
- Produces: `ContentLockHub` constructor now also takes `IEventAggregator eventAggregator, IUserService userService, ILogger<ContentLockHub> logger`; `ContentLockHub.PublishCallInitiatedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey) : Task` (internal). Tasks 5-7 reuse the same constructor shape and the `CreateHub()` test helper defined here.

- [ ] **Step 1: Write the failing test**

Create `ContentLock.Tests/SignalR/ContentLockHubTests.cs`:

```csharp
using ContentLock.Interfaces;
using ContentLock.Notifications;
using ContentLock.Options;
using ContentLock.SignalR;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ContentLock.Tests.SignalR;

/// <summary>
/// Unit tests for the notification-publishing helpers on <see cref="ContentLockHub"/>.
/// These call the extracted `PublishXAsync` methods directly, so no SignalR
/// HubCallerContext/ClaimsPrincipal setup is required.
/// </summary>
public class ContentLockHubTests
{
    private static (
        ContentLockHub hub,
        IEventAggregator eventAggregator,
        IUserService userService
    ) CreateHub()
    {
        var contentLockService = Substitute.For<IContentLockService>();
        var options = Substitute.For<IOptionsMonitor<ContentLockOptions>>();
        var hubContext = Substitute.For<IHubContext<ContentLockHub, IContentLockHubEvents>>();
        var eventAggregator = Substitute.For<IEventAggregator>();
        var userService = Substitute.For<IUserService>();

        var hub = new ContentLockHub(
            contentLockService,
            options,
            hubContext,
            eventAggregator,
            userService,
            NullLogger<ContentLockHub>.Instance);

        return (hub, eventAggregator, userService);
    }

    [Fact]
    public async Task PublishCallInitiatedAsync_ResolvesCalleeNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var callee = Substitute.For<IUser>();
        callee.Name.Returns("Callee Name");
        userService.GetAsync(calleeKey).Returns(callee);

        await hub.PublishCallInitiatedAsync(callerKey, "Caller Name", calleeKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallInitiatedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallInitiatedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(calleeKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallInitiatedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallInitiatedAsync(callerKey, "Caller Name", calleeKey);

        await act.Should().NotThrowAsync();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: FAIL to compile — `ContentLockHub` has no 6-argument constructor and no `PublishCallInitiatedAsync` method.

- [ ] **Step 3: Update the `ContentLockHub` constructor and fields**

In `ContentLock/SignalR/ContentLockHub.cs`, add usings alongside the existing ones:

```csharp
using ContentLock.Notifications;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Services;
```

First, replace the three instance fields (current lines 18-20):

```csharp
    private readonly IContentLockService _contentLockService;
    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _hubContext;
```

with:

```csharp
    private readonly IContentLockService _contentLockService;
    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHubContext<ContentLockHub, IContentLockHubEvents> _hubContext;
    private readonly IEventAggregator _eventAggregator;
    private readonly IUserService _userService;
    private readonly ILogger<ContentLockHub> _logger;
```

Leave the four static fields below them (`ConnectedUsers`, `ActiveCalls`, `_pendingRings`, `_pendingRingByCallee`, current lines 22-33) untouched. Then replace the constructor (current lines 35-44):

```csharp
    public ContentLockHub(
        IContentLockService contentLockService,
        IOptionsMonitor<ContentLockOptions> options,
        IHubContext<ContentLockHub, IContentLockHubEvents> hubContext)
    {
        _contentLockService = contentLockService;
        _options = options;
        _hubContext = hubContext;
        _options.OnChange(OnOptionsChanged);
    }
```

with:

```csharp
    public ContentLockHub(
        IContentLockService contentLockService,
        IOptionsMonitor<ContentLockOptions> options,
        IHubContext<ContentLockHub, IContentLockHubEvents> hubContext,
        IEventAggregator eventAggregator,
        IUserService userService,
        ILogger<ContentLockHub> logger)
    {
        _contentLockService = contentLockService;
        _options = options;
        _hubContext = hubContext;
        _eventAggregator = eventAggregator;
        _userService = userService;
        _logger = logger;
        _options.OnChange(OnOptionsChanged);
    }
```

- [ ] **Step 4: Add `PublishCallInitiatedAsync`**

Add this method in the "Private Helpers" region of `ContentLockHub.cs` (near `BroadcastInCallUsersAsync`):

```csharp
    internal async Task PublishCallInitiatedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey)
    {
        var callee = await _userService.GetAsync(calleeUserKey);
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallInitiatedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallInitiatedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }
```

- [ ] **Step 5: Call it from `SendCallOfferAsync`**

In `SendCallOfferAsync`, find:

```csharp
        // Relay the offer to the target user's connections
        var targetConnections = GetConnectionsForUser(targetUserKey);
        if (targetConnections.Length == 0) return;

        await Clients.Clients(targetConnections).ReceiveCallOffer(callerKey.Value, callerName, sdpOffer);

        // Start ring timeout — fires CallNoAnswer to caller and MissedCall to callee if unanswered
```

Replace with:

```csharp
        // Relay the offer to the target user's connections
        var targetConnections = GetConnectionsForUser(targetUserKey);
        if (targetConnections.Length == 0) return;

        await Clients.Clients(targetConnections).ReceiveCallOffer(callerKey.Value, callerName, sdpOffer);

        await PublishCallInitiatedAsync(callerKey.Value, callerName, targetUserKey);

        // Start ring timeout — fires CallNoAnswer to caller and MissedCall to callee if unanswered
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add ContentLock/SignalR/ContentLockHub.cs ContentLock.Tests/SignalR/ContentLockHubTests.cs
git commit -m "feat: publish CallInitiatedNotification when a call offer is routed"
```

---

### Task 5: Publish `CallDeclinedNotification`

**Files:**
- Modify: `ContentLock/SignalR/ContentLockHub.cs` (`DeclineCallAsync`, ~line 174-184)
- Test: `ContentLock.Tests/SignalR/ContentLockHubTests.cs`

**Interfaces:**
- Produces: `ContentLockHub.PublishCallDeclinedAsync(Guid callerUserKey, Guid calleeUserKey, string calleeUserName) : Task` (internal).

- [ ] **Step 1: Write the failing tests**

Add to `ContentLockHubTests`:

```csharp
    [Fact]
    public async Task PublishCallDeclinedAsync_ResolvesCallerNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var caller = Substitute.For<IUser>();
        caller.Name.Returns("Caller Name");
        userService.GetAsync(callerKey).Returns(caller);

        await hub.PublishCallDeclinedAsync(callerKey, calleeKey, "Callee Name");

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallDeclinedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallDeclinedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(callerKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallDeclinedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallDeclinedAsync(callerKey, calleeKey, "Callee Name");

        await act.Should().NotThrowAsync();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: FAIL to compile — `PublishCallDeclinedAsync` doesn't exist yet.

- [ ] **Step 3: Add `PublishCallDeclinedAsync`**

Add this method to `ContentLockHub.cs`, directly below `PublishCallInitiatedAsync`:

```csharp
    internal async Task PublishCallDeclinedAsync(Guid callerUserKey, Guid calleeUserKey, string calleeUserName)
    {
        var caller = await _userService.GetAsync(callerUserKey);
        var callerUserName = caller?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallDeclinedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallDeclinedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }
```

- [ ] **Step 4: Call it from `DeclineCallAsync`**

Replace the current `DeclineCallAsync` method:

```csharp
    public async Task DeclineCallAsync(Guid callerUserKey)
    {
        // Cancel the ring timeout — callee explicitly declined
        CancelRingTimeout(callerUserKey);

        var callerConnections = GetConnectionsForUser(callerUserKey);
        if (callerConnections.Length > 0)
        {
            await Clients.Clients(callerConnections).CallDeclined();
        }
    }
```

with:

```csharp
    public async Task DeclineCallAsync(Guid callerUserKey)
    {
        // Cancel the ring timeout — callee explicitly declined
        CancelRingTimeout(callerUserKey);

        var callerConnections = GetConnectionsForUser(callerUserKey);
        if (callerConnections.Length > 0)
        {
            await Clients.Clients(callerConnections).CallDeclined();
        }

        var currentUmbUser = this.Context.User?.GetUmbracoIdentity();
        var calleeKey = currentUmbUser?.GetUserKey();
        var calleeName = currentUmbUser?.Name ?? "Unknown";

        if (calleeKey.HasValue)
        {
            await PublishCallDeclinedAsync(callerUserKey, calleeKey.Value, calleeName);
        }
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: PASS (4 tests total)

- [ ] **Step 6: Commit**

```bash
git add ContentLock/SignalR/ContentLockHub.cs ContentLock.Tests/SignalR/ContentLockHubTests.cs
git commit -m "feat: publish CallDeclinedNotification when a call is declined"
```

---

### Task 6: Publish `CallMissedNotification`

**Files:**
- Modify: `ContentLock/SignalR/ContentLockHub.cs` (`HandleRingTimeoutAsync`, ~line 278-301)
- Test: `ContentLock.Tests/SignalR/ContentLockHubTests.cs`

**Interfaces:**
- Produces: `ContentLockHub.PublishCallMissedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey) : Task` (internal).

- [ ] **Step 1: Write the failing tests**

Add to `ContentLockHubTests`:

```csharp
    [Fact]
    public async Task PublishCallMissedAsync_ResolvesCalleeNameAndPublishesNotification()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();

        var callee = Substitute.For<IUser>();
        callee.Name.Returns("Callee Name");
        userService.GetAsync(calleeKey).Returns(callee);

        await hub.PublishCallMissedAsync(callerKey, "Caller Name", calleeKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallMissedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallMissedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        userService.GetAsync(calleeKey).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallMissedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallMissedAsync(callerKey, "Caller Name", calleeKey);

        await act.Should().NotThrowAsync();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: FAIL to compile — `PublishCallMissedAsync` doesn't exist yet.

- [ ] **Step 3: Add `PublishCallMissedAsync`**

Add this method to `ContentLockHub.cs`, directly below `PublishCallDeclinedAsync`:

```csharp
    internal async Task PublishCallMissedAsync(Guid callerUserKey, string callerUserName, Guid calleeUserKey)
    {
        var callee = await _userService.GetAsync(calleeUserKey);
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallMissedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallMissedNotification handler threw an exception for a call from {callerUserKey} to {calleeUserKey}", callerUserKey, calleeUserKey);
        }
    }
```

- [ ] **Step 4: Call it from `HandleRingTimeoutAsync`**

Replace the current method:

```csharp
    private async Task HandleRingTimeoutAsync(Guid callerKey, Guid calleeKey, string callerName, CancellationToken ct)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(_options.CurrentValue.WebRTC.RingTimeoutSeconds), ct);
        }
        catch (OperationCanceledException)
        {
            // Timer was cancelled — call was answered, declined, or a party disconnected; nothing to do
            return;
        }

        _pendingRings.TryRemove(callerKey, out _);
        _pendingRingByCallee.TryRemove(calleeKey, out _);

        var callerConns = GetConnectionsForUser(callerKey);
        var calleeConns = GetConnectionsForUser(calleeKey);

        if (callerConns.Length > 0)
            await _hubContext.Clients.Clients(callerConns).CallNoAnswer();

        if (calleeConns.Length > 0)
            await _hubContext.Clients.Clients(calleeConns).MissedCall(callerKey, callerName);
    }
```

with:

```csharp
    private async Task HandleRingTimeoutAsync(Guid callerKey, Guid calleeKey, string callerName, CancellationToken ct)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(_options.CurrentValue.WebRTC.RingTimeoutSeconds), ct);
        }
        catch (OperationCanceledException)
        {
            // Timer was cancelled — call was answered, declined, or a party disconnected; nothing to do
            return;
        }

        _pendingRings.TryRemove(callerKey, out _);
        _pendingRingByCallee.TryRemove(calleeKey, out _);

        var callerConns = GetConnectionsForUser(callerKey);
        var calleeConns = GetConnectionsForUser(calleeKey);

        if (callerConns.Length > 0)
            await _hubContext.Clients.Clients(callerConns).CallNoAnswer();

        if (calleeConns.Length > 0)
            await _hubContext.Clients.Clients(calleeConns).MissedCall(callerKey, callerName);

        await PublishCallMissedAsync(callerKey, callerName, calleeKey);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: PASS (6 tests total)

- [ ] **Step 6: Commit**

```bash
git add ContentLock/SignalR/ContentLockHub.cs ContentLock.Tests/SignalR/ContentLockHubTests.cs
git commit -m "feat: publish CallMissedNotification when a ring times out"
```

---

### Task 7: `CallOriginator` role tracking + publish `CallEndedNotification`

**Files:**
- Modify: `ContentLock/SignalR/ContentLockHub.cs` (`SendCallAnswerAsync` ~line 134-157, `EndCallAsync` ~line 190-210, `CleanUpCallOnDisconnectAsync` ~line 229-246)
- Test: `ContentLock.Tests/SignalR/ContentLockHubTests.cs`

**Interfaces:**
- Produces: `internal static readonly ConcurrentDictionary<Guid, Guid> ContentLockHub.CallOriginator` (maps a call participant's key to the original caller's key); `ContentLockHub.PublishCallEndedAsync(Guid userKeyA, Guid userKeyB) : Task` (internal — order of the two arguments does not matter, roles are resolved from `CallOriginator`).

`ActiveCalls` is bidirectional (`A→B` and `B→A`), so once a call is answered there's no record of who was the *original caller* — but `CallEndedNotification` needs that distinction regardless of which party hangs up. `CallOriginator` is populated in `SendCallAnswerAsync` (the one place both keys are known simultaneously) and removed by `PublishCallEndedAsync` itself.

- [ ] **Step 1: Write the failing tests**

Add to `ContentLockHubTests`:

```csharp
    [Fact]
    public async Task PublishCallEndedAsync_WhenFirstArgIsOriginalCaller_PublishesWithCorrectRoles()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        ContentLockHub.CallOriginator[callerKey] = callerKey;
        ContentLockHub.CallOriginator[calleeKey] = callerKey;

        var caller = Substitute.For<IUser>();
        caller.Name.Returns("Caller Name");
        userService.GetAsync(callerKey).Returns(caller);
        var callee = Substitute.For<IUser>();
        callee.Name.Returns("Callee Name");
        userService.GetAsync(calleeKey).Returns(callee);

        await hub.PublishCallEndedAsync(callerKey, calleeKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallEndedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CallerUserName == "Caller Name" &&
                n.CalleeUserKey == calleeKey &&
                n.CalleeUserName == "Callee Name"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallEndedAsync_WhenFirstArgIsOriginalCallee_StillPublishesWithOriginalRoles()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        ContentLockHub.CallOriginator[callerKey] = callerKey;
        ContentLockHub.CallOriginator[calleeKey] = callerKey;

        userService.GetAsync(callerKey).Returns((IUser?)null);
        userService.GetAsync(calleeKey).Returns((IUser?)null);

        // Simulates the callee's connection being the one that calls EndCallAsync,
        // so the (currentUserKey, peerUserKey) pair arrives as (calleeKey, callerKey).
        await hub.PublishCallEndedAsync(calleeKey, callerKey);

        await eventAggregator.Received(1).PublishAsync(
            Arg.Is<CallEndedNotification>(n =>
                n.CallerUserKey == callerKey &&
                n.CalleeUserKey == calleeKey),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishCallEndedAsync_RemovesCallOriginatorEntriesForBothParties()
    {
        var (hub, _, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        ContentLockHub.CallOriginator[callerKey] = callerKey;
        ContentLockHub.CallOriginator[calleeKey] = callerKey;
        userService.GetAsync(Arg.Any<Guid>()).Returns((IUser?)null);

        await hub.PublishCallEndedAsync(callerKey, calleeKey);

        ContentLockHub.CallOriginator.Should().NotContainKey(callerKey);
        ContentLockHub.CallOriginator.Should().NotContainKey(calleeKey);
    }

    [Fact]
    public async Task PublishCallEndedAsync_WhenEventAggregatorThrows_DoesNotThrow()
    {
        var (hub, eventAggregator, userService) = CreateHub();
        var callerKey = Guid.NewGuid();
        var calleeKey = Guid.NewGuid();
        ContentLockHub.CallOriginator[callerKey] = callerKey;
        ContentLockHub.CallOriginator[calleeKey] = callerKey;
        userService.GetAsync(Arg.Any<Guid>()).Returns((IUser?)null);
        eventAggregator
            .PublishAsync(Arg.Any<CallEndedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsForAnyArgs(new InvalidOperationException("Handler boom"));

        var act = async () => await hub.PublishCallEndedAsync(callerKey, calleeKey);

        await act.Should().NotThrowAsync();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: FAIL to compile — `ContentLockHub.CallOriginator` and `PublishCallEndedAsync` don't exist yet.

- [ ] **Step 3: Add the `CallOriginator` field**

In `ContentLockHub.cs`, add this alongside the existing static fields (`ConnectedUsers`, `ActiveCalls`, etc.):

```csharp
    // Maps each call participant's user key to the original caller's key for their current call.
    // ActiveCalls is bidirectional (A→B and B→A) so by itself it can't tell you who initiated the
    // call once it's answered — this dictionary preserves that distinction so CallEndedNotification
    // always reports the correct caller/callee roles regardless of who hangs up.
    internal static readonly ConcurrentDictionary<Guid, Guid> CallOriginator = new();
```

- [ ] **Step 4: Populate it in `SendCallAnswerAsync`**

Find:

```csharp
        // Mark both users as in an active call (bidirectional so either can look up the other)
        ActiveCalls[callerUserKey] = calleeKey.Value;
        ActiveCalls[calleeKey.Value] = callerUserKey;
```

Replace with:

```csharp
        // Mark both users as in an active call (bidirectional so either can look up the other)
        ActiveCalls[callerUserKey] = calleeKey.Value;
        ActiveCalls[calleeKey.Value] = callerUserKey;

        // Record which of the two was the original caller, for CallEndedNotification later
        CallOriginator[callerUserKey] = callerUserKey;
        CallOriginator[calleeKey.Value] = callerUserKey;
```

- [ ] **Step 5: Add `PublishCallEndedAsync`**

Add this method to `ContentLockHub.cs`, directly below `PublishCallMissedAsync`:

```csharp
    internal async Task PublishCallEndedAsync(Guid userKeyA, Guid userKeyB)
    {
        CallOriginator.TryRemove(userKeyA, out var originatorForA);
        CallOriginator.TryRemove(userKeyB, out _);

        var callerUserKey = originatorForA == userKeyA ? userKeyA : userKeyB;
        var calleeUserKey = callerUserKey == userKeyA ? userKeyB : userKeyA;

        var caller = await _userService.GetAsync(callerUserKey);
        var callee = await _userService.GetAsync(calleeUserKey);
        var callerUserName = caller?.Name ?? "Unknown";
        var calleeUserName = callee?.Name ?? "Unknown";

        try
        {
            await _eventAggregator.PublishAsync(
                new CallEndedNotification(callerUserKey, callerUserName, calleeUserKey, calleeUserName),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "A CallEndedNotification handler threw an exception for a call between {userKeyA} and {userKeyB}", userKeyA, userKeyB);
        }
    }
```

- [ ] **Step 6: Call it from `EndCallAsync`**

Find:

```csharp
        // Remove both parties from the active calls dictionary
        ActiveCalls.TryRemove(currentUserKey.Value, out _);
        ActiveCalls.TryRemove(peerUserKey, out _);

        // Broadcast the updated in-call user list to all connected clients
        await BroadcastInCallUsersAsync();
    }
```

(this is the end of `EndCallAsync`) and replace with:

```csharp
        // Remove both parties from the active calls dictionary
        ActiveCalls.TryRemove(currentUserKey.Value, out _);
        ActiveCalls.TryRemove(peerUserKey, out _);

        await PublishCallEndedAsync(currentUserKey.Value, peerUserKey);

        // Broadcast the updated in-call user list to all connected clients
        await BroadcastInCallUsersAsync();
    }
```

- [ ] **Step 7: Call it from `CleanUpCallOnDisconnectAsync`**

Find:

```csharp
    private async Task CleanUpCallOnDisconnectAsync(Guid disconnectedUserKey)
    {
        // Check if the disconnected user is currently in a call
        if (!ActiveCalls.TryRemove(disconnectedUserKey, out var peerKey)) return;

        // Remove the peer's side of the call record too
        ActiveCalls.TryRemove(peerKey, out _);

        // Notify the peer that the call has ended due to disconnect
        var peerConnections = GetConnectionsForUser(peerKey);
        if (peerConnections.Length > 0)
        {
            await Clients.Clients(peerConnections).CallEnded();
        }

        // Broadcast updated in-call list (now empty for these two users)
        await BroadcastInCallUsersAsync();
    }
```

Replace with:

```csharp
    private async Task CleanUpCallOnDisconnectAsync(Guid disconnectedUserKey)
    {
        // Check if the disconnected user is currently in a call
        if (!ActiveCalls.TryRemove(disconnectedUserKey, out var peerKey)) return;

        // Remove the peer's side of the call record too
        ActiveCalls.TryRemove(peerKey, out _);

        // Notify the peer that the call has ended due to disconnect
        var peerConnections = GetConnectionsForUser(peerKey);
        if (peerConnections.Length > 0)
        {
            await Clients.Clients(peerConnections).CallEnded();
        }

        await PublishCallEndedAsync(disconnectedUserKey, peerKey);

        // Broadcast updated in-call list (now empty for these two users)
        await BroadcastInCallUsersAsync();
    }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj --filter "FullyQualifiedName~ContentLockHubTests"`
Expected: PASS (10 tests total)

- [ ] **Step 9: Run the full test suite**

Run: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj`
Expected: PASS, all tests (existing controller/notification-handler tests plus all new ones added in this plan)

- [ ] **Step 10: Commit**

```bash
git add ContentLock/SignalR/ContentLockHub.cs ContentLock.Tests/SignalR/ContentLockHubTests.cs
git commit -m "feat: publish CallEndedNotification with correct caller/callee roles on call end"
```

---

### Task 8: Documentation

**Files:**
- Create: `docs/src/content/docs/reference/notifications.md`

**Interfaces:**
- None — this task only adds documentation content, consuming the class/property names defined in Tasks 1-7.

- [ ] **Step 1: Create the reference page**

Create `docs/src/content/docs/reference/notifications.md`:

```markdown
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
```

- [ ] **Step 2: Verify the docs site still builds**

Run: `cd docs && npm run build`
Expected: Build succeeds with no errors (confirms frontmatter and markdown are valid, and the new page is picked up by the auto-generated `reference/` sidebar).

- [ ] **Step 3: Commit**

```bash
git add docs/src/content/docs/reference/notifications.md
git commit -m "docs: document notification events and handler registration"
```

---

## Final Verification

After all 8 tasks are complete:

- [ ] Run the full test suite: `dotnet test ContentLock.Tests/ContentLock.Tests.csproj` — expect all tests passing (existing + ~19 new).
- [ ] Build the main project: `dotnet build ContentLock/ContentLock.csproj` — expect a clean build with no new warnings.
- [ ] Build the docs site: `cd docs && npm run build` — expect success.
- [ ] Skim the new `docs/src/content/docs/reference/notifications.md` page in a browser via `npm run dev` (in `docs/`) to confirm it renders and sits correctly in the auto-generated sidebar next to "SignalR Events".
