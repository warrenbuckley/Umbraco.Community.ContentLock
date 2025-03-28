using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;
using ContentLock.Interfaces;
using ContentLock.SignalR;
using ContentLock.Models.Backoffice;

namespace ContentLock.Tests
{
    public class ContentLockHubTests
    {
        private readonly Mock<IContentLockService> _contentLockServiceMock;
        private readonly Mock<IHubCallerClients<IContentLockHubEvents>> _clientsMock;
        private readonly Mock<IContentLockHubEvents> _clientProxyMock;
        private readonly ContentLockHub _hub;

        public ContentLockHubTests()
        {
            _contentLockServiceMock = new Mock<IContentLockService>();
            _clientsMock = new Mock<IHubCallerClients<IContentLockHubEvents>>();
            _clientProxyMock = new Mock<IContentLockHubEvents>();

            _clientsMock.Setup(clients => clients.Caller).Returns(_clientProxyMock.Object);

            _hub = new ContentLockHub(_contentLockServiceMock.Object)
            {
                Clients = _clientsMock.Object
            };
        }

        [Fact]
        public async Task TestOnConnectedAsync()
        {
            // Arrange
            var contentLocks = new List<ContentLockOverviewItem>
            {
                new ContentLockOverviewItem
                {
                    Key = Guid.NewGuid(),
                    NodeName = "Test Node",
                    ContentType = "Test Type",
                    CheckedOutBy = "Test User",
                    CheckedOutByKey = Guid.NewGuid(),
                    LastEdited = DateTime.Now,
                    LockedAtDate = DateTime.Now
                }
            };

            _contentLockServiceMock.Setup(service => service.GetLockOverviewAsync())
                .ReturnsAsync(new ContentLockOverview { Items = contentLocks });

            // Act
            await _hub.OnConnectedAsync();

            // Assert
            _clientProxyMock.Verify(client => client.ReceiveLatestContentLocks(contentLocks), Times.Once);
        }

        [Fact]
        public async Task TestOnDisconnectedAsync()
        {
            // Act
            await _hub.OnDisconnectedAsync(null);

            // Assert
            // No specific assertions for now, just ensuring no exceptions are thrown
        }

        [Fact]
        public async Task TestGetLatestLockInfoForNewConnection()
        {
            // Arrange
            var contentLocks = new List<ContentLockOverviewItem>
            {
                new ContentLockOverviewItem
                {
                    Key = Guid.NewGuid(),
                    NodeName = "Test Node",
                    ContentType = "Test Type",
                    CheckedOutBy = "Test User",
                    CheckedOutByKey = Guid.NewGuid(),
                    LastEdited = DateTime.Now,
                    LockedAtDate = DateTime.Now
                }
            };

            _contentLockServiceMock.Setup(service => service.GetLockOverviewAsync())
                .ReturnsAsync(new ContentLockOverview { Items = contentLocks });

            // Act
            await _hub.GetType().GetMethod("GetLatestLockInfoForNewConnection", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                .Invoke(_hub, null);

            // Assert
            _clientProxyMock.Verify(client => client.ReceiveLatestContentLocks(contentLocks), Times.Once);
        }

        [Fact]
        public async Task TestReceiveLatestContentLocks()
        {
            // Arrange
            var contentLocks = new List<ContentLockOverviewItem>
            {
                new ContentLockOverviewItem
                {
                    Key = Guid.NewGuid(),
                    NodeName = "Test Node",
                    ContentType = "Test Type",
                    CheckedOutBy = "Test User",
                    CheckedOutByKey = Guid.NewGuid(),
                    LastEdited = DateTime.Now,
                    LockedAtDate = DateTime.Now
                }
            };

            // Act
            await _hub.Clients.Caller.ReceiveLatestContentLocks(contentLocks);

            // Assert
            _clientProxyMock.Verify(client => client.ReceiveLatestContentLocks(contentLocks), Times.Once);
        }
    }
}
