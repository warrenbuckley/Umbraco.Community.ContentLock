using ContentLock.Interfaces;

namespace ContentLock.TurnProviders;

/// <summary>
/// No-op provider. Returns an empty set of TURN credentials so the caller
/// falls back to STUN-only ICE negotiation. Used when Provider = "None" (the default).
/// </summary>
public class NoneTurnCredentialProvider : ITurnCredentialProvider
{
    public Task<TurnCredential[]> GetCredentialsAsync(CancellationToken ct = default)
        => Task.FromResult(Array.Empty<TurnCredential>());
}
