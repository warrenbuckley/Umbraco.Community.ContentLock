using ContentLock.Options;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace ContentLock.Tests.Options;

public class ContentLockOptionsTests
{
    [Fact]
    public void AutoLock_DefaultsOff()
    {
        var autoLock = new ContentLockOptions().AutoLock;

        autoLock.Enable.Should().BeFalse();
        autoLock.InactivityTimeoutSeconds.Should().Be(300);
        autoLock.HeartbeatSeconds.Should().Be(60);
        autoLock.InactivityCheckSeconds.Should().Be(15);
    }

    [Fact]
    public void AutoLock_BindsFromContentLockSection()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ContentLock:AutoLock:Enable"] = "true",
            ["ContentLock:AutoLock:HeartbeatSeconds"] = "20",
        }).Build();

        var options = config.GetSection(ContentLockOptions.ConfigName).Get<ContentLockOptions>()!;

        options.AutoLock.Enable.Should().BeTrue();
        options.AutoLock.HeartbeatSeconds.Should().Be(20);
        options.AutoLock.InactivityTimeoutSeconds.Should().Be(300);
    }
}
