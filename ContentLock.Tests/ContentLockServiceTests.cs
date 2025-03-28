using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ContentLock.Interfaces;
using ContentLock.Models.Backoffice;
using ContentLock.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;
using Xunit;

namespace ContentLock.Tests
{
    public class ContentLockServiceTests
    {
        private readonly Mock<ILogger<ContentLockService>> _loggerMock;
        private readonly Mock<IScopeProvider> _scopeProviderMock;
        private readonly Mock<IUserService> _userServiceMock;
        private readonly Mock<IPublishedContentQuery> _publishedContentQueryMock;
        private readonly Mock<IAuditService> _auditServiceMock;
        private readonly Mock<IUserIdKeyResolver> _userIdKeyResolverMock;
        private readonly Mock<IIdKeyMap> _idKeyMapMock;
        private readonly ContentLockService _contentLockService;

        public ContentLockServiceTests()
        {
            _loggerMock = new Mock<ILogger<ContentLockService>>();
            _scopeProviderMock = new Mock<IScopeProvider>();
            _userServiceMock = new Mock<IUserService>();
            _publishedContentQueryMock = new Mock<IPublishedContentQuery>();
            _auditServiceMock = new Mock<IAuditService>();
            _userIdKeyResolverMock = new Mock<IUserIdKeyResolver>();
            _idKeyMapMock = new Mock<IIdKeyMap>();

            _contentLockService = new ContentLockService(
                _loggerMock.Object,
                _scopeProviderMock.Object,
                _userServiceMock.Object,
                _publishedContentQueryMock.Object,
                _auditServiceMock.Object,
                _userIdKeyResolverMock.Object,
                _idKeyMapMock.Object
            );
        }

        [Fact]
        public async Task TestLockContentAsync()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid();
            var contentNodeMock = new Mock<IPublishedContent>();
            contentNodeMock.Setup(c => c.Name).Returns("Test Node");
            contentNodeMock.Setup(c => c.ContentType.Alias).Returns("TestType");
            contentNodeMock.Setup(c => c.UpdateDate).Returns(DateTime.Now);

            _publishedContentQueryMock.Setup(p => p.Content(contentKey)).Returns(contentNodeMock.Object);
            _userServiceMock.Setup(u => u.GetAsync(userKey)).ReturnsAsync(new User { Name = "Test User" });

            // Act
            var result = await _contentLockService.LockContentAsync(contentKey, userKey);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(contentKey, result.Key);
            Assert.Equal("Test Node", result.NodeName);
            Assert.Equal("TestType", result.ContentType);
            Assert.Equal("Test User", result.CheckedOutBy);
            Assert.Equal(userKey, result.CheckedOutByKey);
        }

        [Fact]
        public async Task TestUnlockContentAsync()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid();

            // Act
            await _contentLockService.UnlockContentAsync(contentKey, userKey);

            // Assert
            _scopeProviderMock.Verify(s => s.CreateScope(It.IsAny<bool>()), Times.Once);
        }

        [Fact]
        public async Task TestGetLockInfoAsync()
        {
            // Arrange
            var contentKey = Guid.NewGuid();
            var userKey = Guid.NewGuid();
            var contentLocks = new ContentLocks
            {
                ContentKey = contentKey,
                UserKey = userKey,
                LockedAtDate = DateTime.Now
            };

            _scopeProviderMock.Setup(s => s.CreateScope(It.IsAny<bool>())).Returns(new Mock<IScope>().Object);
            _userServiceMock.Setup(u => u.GetAsync(userKey)).ReturnsAsync(new User { Name = "Test User" });

            // Act
            var result = await _contentLockService.GetLockInfoAsync(contentKey, userKey);

            // Assert
            Assert.NotNull(result);
            Assert.True(result.IsLocked);
            Assert.Equal(userKey, result.LockedByKey);
            Assert.Equal("Test User", result.LockedByName);
        }

        [Fact]
        public async Task TestGetLockOverviewAsync()
        {
            // Arrange
            var contentLocks = new List<ContentLocks>
            {
                new ContentLocks
                {
                    ContentKey = Guid.NewGuid(),
                    UserKey = Guid.NewGuid(),
                    LockedAtDate = DateTime.Now
                }
            };

            _scopeProviderMock.Setup(s => s.CreateScope(It.IsAny<bool>())).Returns(new Mock<IScope>().Object);
            _userServiceMock.Setup(u => u.GetAsync(It.IsAny<Guid>())).ReturnsAsync(new User { Name = "Test User" });

            // Act
            var result = await _contentLockService.GetLockOverviewAsync();

            // Assert
            Assert.NotNull(result);
            Assert.Equal(contentLocks.Count, result.TotalResults);
        }
    }
}
