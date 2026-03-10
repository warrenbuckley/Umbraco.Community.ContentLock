using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ContentLock.Interfaces;
using ContentLock.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ContentLock.TurnProviders;

/// <summary>
/// Fetches time-limited TURN credentials from Cloudflare's Realtime API and caches
/// them for <c>Ttl - 3600</c> seconds so credentials always have at least 1 hour remaining.
/// Cache is evicted on <see cref="IOptionsMonitor{T}.OnChange"/> so rotating the API key
/// takes effect immediately on the next call without a restart.
/// </summary>
public class CloudflareTurnCredentialProvider : ITurnCredentialProvider
{
    private const string CacheKey = "ContentLock:TurnCredentials:Cloudflare";

    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IDisposable? _optionsChangeToken;

    public CloudflareTurnCredentialProvider(
        IOptionsMonitor<ContentLockOptions> options,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _cache = cache;

        // Evict cached credentials whenever config changes (e.g. API key rotation)
        _optionsChangeToken = _options.OnChange(_ => _cache.Remove(CacheKey));
    }

    public async Task<TurnCredential[]> GetCredentialsAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out TurnCredential[]? cached) && cached is not null)
            return cached;

        var cf = _options.CurrentValue.WebRTC.TurnServer.Cloudflare;

        var client = _httpClientFactory.CreateClient("Cloudflare");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cf.ApiToken);

        var response = await client.PostAsJsonAsync(
            $"https://rtc.live.cloudflare.com/v1/turn/keys/{cf.KeyId}/credentials/generate-ice-servers",
            new { ttl = cf.Ttl },
            ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<CloudflareResponse>(ct);
        if (result?.IceServers is null || result.IceServers.Length == 0)
            return [];

        var credentials = result.IceServers
            .Select(s => new TurnCredential(s.Urls, s.Username, s.Credential))
            .ToArray();

        var cacheDuration = TimeSpan.FromSeconds(Math.Max(cf.Ttl - 3600, 300));
        _cache.Set(CacheKey, credentials, cacheDuration);

        return credentials;
    }

    // ── Deserialization models ────────────────────────────────────────────

    private sealed class CloudflareResponse
    {
        [JsonPropertyName("iceServers")]
        public CloudflareIceServer[] IceServers { get; set; } = [];
    }

    private sealed class CloudflareIceServer
    {
        [JsonPropertyName("urls")]
        public string[] Urls { get; set; } = [];

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("credential")]
        public string? Credential { get; set; }
    }
}
