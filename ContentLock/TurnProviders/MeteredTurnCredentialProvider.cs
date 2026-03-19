using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ContentLock.Interfaces;
using ContentLock.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ContentLock.TurnProviders;

/// <summary>
/// Fetches TURN credentials from Metered.ca (including the free Open Relay service).
/// Credentials are cached for <see cref="ContentLockOptions.WebRTCOptions.TurnServerProviderOptions.MeteredOptions.CacheTtlSeconds"/> seconds.
/// Cache is evicted on <see cref="IOptionsMonitor{T}.OnChange"/> so rotating the API key
/// takes effect immediately on the next call without a restart.
/// </summary>
/// <remarks>
/// Metered returns a singular <c>urls</c> string per entry rather than an array.
/// This provider wraps each entry in a single-element array for a consistent interface.
/// Sign up at https://www.metered.ca/tools/openrelay/ for a free account (20 GB/month).
/// </remarks>
public class MeteredTurnCredentialProvider : ITurnCredentialProvider
{
    private const string CacheKey = "ContentLock:TurnCredentials:Metered";

    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IDisposable? _optionsChangeToken;

    public MeteredTurnCredentialProvider(
        IOptionsMonitor<ContentLockOptions> options,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _cache = cache;

        _optionsChangeToken = _options.OnChange(_ => _cache.Remove(CacheKey));
    }

    public async Task<TurnCredential[]> GetCredentialsAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out TurnCredential[]? cached) && cached is not null)
            return cached;

        var metered = _options.CurrentValue.WebRTC.TurnServer.Metered;

        var client = _httpClientFactory.CreateClient("Metered");
        var url = $"https://{metered.AppName}.metered.live/api/v1/turn/credentials?apiKey={metered.ApiKey}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var entries = await response.Content.ReadFromJsonAsync<MeteredIceServer[]>(ct);
        if (entries is null || entries.Length == 0)
            return [];

        var credentials = entries
            .Select(s => new TurnCredential(
                Urls: [s.Urls],
                Username: s.Username,
                Credential: s.Credential))
            .ToArray();

        var cacheDuration = TimeSpan.FromSeconds(Math.Max(metered.CacheTtlSeconds, 300));
        _cache.Set(CacheKey, credentials, cacheDuration);

        return credentials;
    }

    // ── Deserialization model ─────────────────────────────────────────────

    private sealed class MeteredIceServer
    {
        // Metered returns singular "urls" string (not an array)
        [JsonPropertyName("urls")]
        public string Urls { get; set; } = "";

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("credential")]
        public string? Credential { get; set; }
    }
}
