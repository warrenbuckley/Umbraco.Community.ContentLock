using NUnit.Framework;
using Moq;
using Microsoft.Extensions.Logging;
using ContentLock.Services;
using ContentLock.Interfaces;
using ContentLock.Models.Database;
using ContentLock.Models.Backoffice;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Infrastructure.Persistence;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Cms.Core; // Added for Attempt<int>
using Umbraco.Cms.Core.Models; // Added for AuditType

namespace ContentLock.Tests.Unit
{
    [TestFixture]
    public class ContentLockServiceTests
    {
        private Mock<ILogger<ContentLockService>> _mockLogger;
        private Mock<IScopeProvider> _mockScopeProvider;
        private Mock<IUserService> _mockUserService;
        private Mock<IPublishedContentQuery> _mockPublishedContentQuery;
        private Mock<IAuditService> _mockAuditService;
        private Mock<IUserIdKeyResolver> _mockUserIdKeyResolver;
        private Mock<IIdKeyMap> _mockIdKeyMap;
        private Mock<IScope> _mockScope;
        private Mock<IDatabase> _mockDatabase;
        private ContentLockService _service;

        [SetUp]
        public void Setup()
        {
            _mockLogger = new Mock<ILogger<ContentLockService>>();
            _mockScopeProvider = new Mock<IScopeProvider>();
            _mockUserService = new Mock<IUserService>();
            _mockPublishedContentQuery = new Mock<IPublishedContentQuery>();
            _mockAuditService = new Mock<IAuditService>();
            _mockUserIdKeyResolver = new Mock<IUserIdKeyResolver>();
            _mockIdKeyMap = new Mock<IIdKeyMap>();
            _mockScope = new Mock<IScope>();
            _mockDatabase = new Mock<IDatabase>();

            _mockScopeProvider.Setup(x => x.CreateScope(It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>())).Returns(_mockScope.Object);
            _mockScope.Setup(x => x.Database).Returns(_mockDatabase.Object);

            _service = new ContentLockService(
                _mockLogger.Object,
                _mockScopeProvider.Object,
                _mockUserService.Object,
                _mockPublishedContentQuery.Object,
                _mockAuditService.Object,
                _mockUserIdKeyResolver.Object,
                _mockIdKeyMap.Object
            );
        }

        [Test]
        public async Task GetLockInfoAsync_ContentNotLocked_ReturnsNotLockedStatus()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid();
            _mockDatabase.Setup(db => db.SingleOrDefaultById<ContentLocks>(contentKey)).Returns((ContentLocks)null);

            // Act
            var result = await _service.GetLockInfoAsync(contentKey, userKey);

            // Assert
            Assert.IsNotNull(result);
            Assert.IsFalse(result.IsLocked);
        }

        [Test]
        public async Task GetLockInfoAsync_ContentLockedByOther_ReturnsLockedStatus()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid();
            var lockerUserKey = Guid.NewGuid();
            var lockInfo = new ContentLocks { ContentKey = contentKey, UserKey = lockerUserKey, LockedAtDate = DateTime.UtcNow };
            var mockUser = new Mock<IUser>();
            mockUser.Setup(u => u.Name).Returns("Locker User");

            _mockDatabase.Setup(db => db.SingleOrDefaultById<ContentLocks>(contentKey)).Returns(lockInfo);
            _mockUserService.Setup(us => us.GetAsync(lockerUserKey)).ReturnsAsync(mockUser.Object);

            // Act
            var result = await _service.GetLockInfoAsync(contentKey, userKey);

            // Assert
            Assert.IsNotNull(result);
            Assert.IsTrue(result.IsLocked);
            Assert.AreEqual(lockerUserKey, result.LockedByKey);
            Assert.AreEqual("Locker User", result.LockedByName);
            Assert.IsFalse(result.LockedBySelf);
        }

        [Test]
        public async Task GetLockInfoAsync_ContentLockedBySelf_ReturnsLockedStatusAndSelf()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid(); // This is also the locker
            var lockInfo = new ContentLocks { ContentKey = contentKey, UserKey = userKey, LockedAtDate = DateTime.UtcNow };
            var mockUser = new Mock<IUser>();
            mockUser.Setup(u => u.Name).Returns("Current User");

            _mockDatabase.Setup(db => db.SingleOrDefaultById<ContentLocks>(contentKey)).Returns(lockInfo);
            _mockUserService.Setup(us => us.GetAsync(userKey)).ReturnsAsync(mockUser.Object);

            // Act
            var result = await _service.GetLockInfoAsync(contentKey, userKey);

            // Assert
            Assert.IsNotNull(result);
            Assert.IsTrue(result.IsLocked);
            Assert.AreEqual(userKey, result.LockedByKey);
            Assert.AreEqual("Current User", result.LockedByName);
            Assert.IsTrue(result.LockedBySelf);
        }

        [Test]
        public async Task GetLockOverviewAsync_NoLocks_ReturnsEmptyOverview()
        {
            // Arrange
            _mockDatabase.Setup(db => db.Fetch<ContentLocks>(It.IsAny<string>(), It.IsAny<object[]>())).Returns(new List<ContentLocks>());


            // Act
            var result = await _service.GetLockOverviewAsync();

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(0, result.TotalResults);
            Assert.IsEmpty(result.Items);
        }

        [Test]
        public async Task GetLockOverviewAsync_MultipleLocks_ReturnsOverviewWithItems()
        {
            // Arrange
            var lock1Key = Guid.NewGuid(); var user1Key = Guid.NewGuid();
            var lock2Key = Guid.NewGuid(); var user2Key = Guid.NewGuid();
            var locks = new List<ContentLocks> { new ContentLocks { ContentKey = lock1Key, UserKey = user1Key, LockedAtDate = DateTime.UtcNow }, new ContentLocks { ContentKey = lock2Key, UserKey = user2Key, LockedAtDate = DateTime.UtcNow } };
            _mockDatabase.Setup(db => db.Fetch<ContentLocks>(It.IsAny<string>(), It.IsAny<object[]>())).Returns(locks);


            var mockContent1 = new Mock<IPublishedContent>(); mockContent1.Setup(c => c.Name).Returns("Node1"); mockContent1.Setup(c => c.ContentType.Alias).Returns("docType1"); mockContent1.Setup(c => c.UpdateDate).Returns(DateTime.UtcNow.AddHours(-1));
            var mockContent2 = new Mock<IPublishedContent>(); mockContent2.Setup(c => c.Name).Returns("Node2"); mockContent2.Setup(c => c.ContentType.Alias).Returns("docType2"); mockContent2.Setup(c => c.UpdateDate).Returns(DateTime.UtcNow.AddHours(-2));
            _mockPublishedContentQuery.Setup(pcq => pcq.Content(lock1Key)).Returns(mockContent1.Object);
            _mockPublishedContentQuery.Setup(pcq => pcq.Content(lock2Key)).Returns(mockContent2.Object);
            var mockUser1 = new Mock<IUser>(); mockUser1.Setup(u => u.Name).Returns("User One");
            var mockUser2 = new Mock<IUser>(); mockUser2.Setup(u => u.Name).Returns("User Two");
            _mockUserService.Setup(us => us.GetAsync(user1Key)).ReturnsAsync(mockUser1.Object);
            _mockUserService.Setup(us => us.GetAsync(user2Key)).ReturnsAsync(mockUser2.Object);

            // Act
            var result = await _service.GetLockOverviewAsync();

            // Assert
            Assert.AreEqual(2, result.TotalResults);
            Assert.AreEqual(2, result.Items.Count);
            Assert.IsTrue(result.Items.Any(i => i.Key == lock1Key && i.NodeName == "Node1" && i.CheckedOutBy == "User One"));
            Assert.IsTrue(result.Items.Any(i => i.Key == lock2Key && i.NodeName == "Node2" && i.CheckedOutBy == "User Two"));
        }

        [Test]
        public async Task GetLockOverviewAsync_LockWithNoContentNode_SkipsItem()
        {
            // Arrange
            var lockKey = Guid.NewGuid(); var userKey = Guid.NewGuid();
            var locks = new List<ContentLocks> { new ContentLocks { ContentKey = lockKey, UserKey = userKey, LockedAtDate = DateTime.UtcNow } };
            _mockDatabase.Setup(db => db.Fetch<ContentLocks>(It.IsAny<string>(), It.IsAny<object[]>())).Returns(locks);
            _mockPublishedContentQuery.Setup(pcq => pcq.Content(lockKey)).Returns((IPublishedContent)null);
            var mockUser = new Mock<IUser>(); mockUser.Setup(u => u.Name).Returns("Test User");
            _mockUserService.Setup(us => us.GetAsync(userKey)).ReturnsAsync(mockUser.Object); // Still need to mock user service

            // Act
            var result = await _service.GetLockOverviewAsync();

            // Assert
            Assert.AreEqual(1, result.TotalResults); // Total results from DB
            Assert.AreEqual(0, result.Items.Count); // But no items in the overview list as content node was null
        }

        [Test]
        public async Task LockContentAsync_ValidRequest_SavesToDbAndAuditsAndReturnsItem()
        {
            // Arrange
            var contentKey = Guid.NewGuid(); var userKey = Guid.NewGuid();
            var userId = 123; var contentId = 456;
            _mockDatabase.Setup(db => db.SaveAsync(It.IsAny<ContentLocks>())).Returns(Task.CompletedTask);
            _mockUserIdKeyResolver.Setup(r => r.GetAsync(userKey)).ReturnsAsync(userId);
            _mockIdKeyMap.Setup(m => m.GetIdForKey(contentKey, Umbraco.Cms.Core.UmbracoObjectTypes.Document)).Returns(Attempt<int>.Succeed(contentId));
            var mockContent = new Mock<IPublishedContent>(); mockContent.Setup(c => c.Name).Returns("Test Node"); mockContent.Setup(c => c.ContentType.Alias).Returns("docTest"); mockContent.Setup(c => c.UpdateDate).Returns(DateTime.UtcNow.AddMinutes(-5));
            _mockPublishedContentQuery.Setup(pcq => pcq.Content(contentKey)).Returns(mockContent.Object);
            var mockUser = new Mock<IUser>(); mockUser.Setup(u => u.Name).Returns("Test User");
            _mockUserService.Setup(us => us.GetAsync(userKey)).ReturnsAsync(mockUser.Object);

            // Act
            var result = await _service.LockContentAsync(contentKey, userKey);

            // Assert
            _mockDatabase.Verify(db => db.SaveAsync(It.Is<ContentLocks>(cl => cl.ContentKey == contentKey && cl.UserKey == userKey)), Times.Once);
            _mockAuditService.Verify(a => a.Add(AuditType.Custom, userId, contentId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Locked", "Page Locked"), Times.Once);
            Assert.IsNotNull(result);
            Assert.AreEqual(contentKey, result.Key);
            Assert.AreEqual("Test Node", result.NodeName);
            Assert.AreEqual("Test User", result.CheckedOutBy);
        }

        [Test]
        public async Task UnlockContentAsync_ValidRequest_DeletesFromDbAndAudits()
        {
            // Arrange
            var contentKey = Guid.NewGuid(); var userKey = Guid.NewGuid();
            var userId = 123; var contentId = 456;
            var lockEntry = new ContentLocks { ContentKey = contentKey, UserKey = userKey, LockedAtDate = DateTime.UtcNow };

            _mockDatabase.Setup(db => db.SingleOrDefaultById<ContentLocks>(contentKey)).Returns(lockEntry);
            _mockDatabase.Setup(db => db.DeleteAsync(It.IsAny<ContentLocks>())).ReturnsAsync(1); // Assuming DeleteAsync returns number of rows affected
            _mockUserIdKeyResolver.Setup(r => r.GetAsync(userKey)).ReturnsAsync(userId);
            _mockIdKeyMap.Setup(m => m.GetIdForKey(contentKey, Umbraco.Cms.Core.UmbracoObjectTypes.Document)).Returns(Attempt<int>.Succeed(contentId));

            // Act
            await _service.UnlockContentAsync(contentKey, userKey);

            // Assert
            _mockDatabase.Verify(db => db.DeleteAsync(It.Is<ContentLocks>(cl => cl.ContentKey == contentKey && cl.UserKey == userKey)), Times.Once);
            _mockAuditService.Verify(a => a.Add(AuditType.Custom, userId, contentId, Umbraco.Cms.Core.Constants.ObjectTypes.Strings.Document, "Page Unlocked", "Page Unlocked"), Times.Once);
        }
    }
}
