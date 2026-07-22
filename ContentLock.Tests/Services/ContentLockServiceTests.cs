using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Notifications;
using ContentLock.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
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
