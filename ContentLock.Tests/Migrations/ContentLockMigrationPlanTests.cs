using ContentLock.Migrations;
using FluentAssertions;
using Xunit;

namespace ContentLock.Tests.Migrations;

public class ContentLockMigrationPlanTests
{
    [Fact]
    public void Plan_FinalState()
    {
        var plan = new ContentLockMigrationPlan();

        plan.Validate();
        plan.Name.Should().Be("Umbraco.Community.ContentLock");
        plan.FinalState.Should().Be("ContentLock.AddAutoLockActivityColumns");
    }

    // Sites on the custom build TB.Umbraco.ContentLock 17.1.1-autolockv2 are stored at ContentLock.AddIsAutoLockColumn
    [Theory]
    [InlineData("ContentLock.AddUserPermissionToAdmins", "ContentLock.AddIsAutoLockColumn")]
    [InlineData("ContentLock.AddIsAutoLockColumn", "ContentLock.AddAutoLockActivityColumns")]
    public void Plan_ChainsFromCustomBuildState(string from, string to)
        => new ContentLockMigrationPlan().Transitions[from]!.TargetState.Should().Be(to);
}
