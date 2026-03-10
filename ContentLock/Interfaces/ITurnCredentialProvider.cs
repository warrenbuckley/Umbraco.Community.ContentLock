namespace ContentLock.Interfaces;

public interface ITurnCredentialProvider
{
    Task<TurnCredential[]> GetCredentialsAsync(CancellationToken ct = default);
}

public record TurnCredential(string[] Urls, string? Username, string? Credential);
