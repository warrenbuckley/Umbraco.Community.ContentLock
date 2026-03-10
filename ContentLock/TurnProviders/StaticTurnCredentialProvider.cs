using ContentLock.Interfaces;
using ContentLock.Options;
using Microsoft.Extensions.Options;

namespace ContentLock.TurnProviders;

/// <summary>
/// Reads static TURN credentials from the <c>ContentLock:WebRTC:TurnServers</c>
/// appsettings array. No HTTP calls are made; credentials are reactive via
/// <see cref="IOptionsMonitor{T}"/>. Migration path for operators with self-hosted TURN.
/// </summary>
public class StaticTurnCredentialProvider : ITurnCredentialProvider
{
    private readonly IOptionsMonitor<ContentLockOptions> _options;

    public StaticTurnCredentialProvider(IOptionsMonitor<ContentLockOptions> options)
        => _options = options;

    public Task<TurnCredential[]> GetCredentialsAsync(CancellationToken ct = default)
    {
        var turnServers = _options.CurrentValue.WebRTC.TurnServers;

        var credentials = turnServers
            .Select(s => new TurnCredential(
                Urls: [s.Urls],
                Username: string.IsNullOrEmpty(s.Username) ? null : s.Username,
                Credential: string.IsNullOrEmpty(s.Credential) ? null : s.Credential))
            .ToArray();

        return Task.FromResult(credentials);
    }
}
