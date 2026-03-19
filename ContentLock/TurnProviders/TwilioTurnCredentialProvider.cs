using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using ContentLock.Interfaces;
using ContentLock.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ContentLock.TurnProviders;

/// <summary>
/// Fetches time-limited TURN credentials from Twilio's Network Traversal Service and caches
/// them for <c>Ttl - 3600</c> seconds so credentials always have at least 1 hour remaining.
/// Cache is evicted on <see cref="IOptionsMonitor{T}.OnChange"/> so rotating credentials
/// takes effect immediately on the next call without a restart.
/// </summary>
/// <remarks>
/// Twilio returns a singular <c>url</c> string per entry rather than a <c>urls</c> array.
/// This provider wraps each <c>url</c> in a single-element array for a consistent interface.
/// </remarks>
public class TwilioTurnCredentialProvider : ITurnCredentialProvider
{
    private const string CacheKey = "ContentLock:TurnCredentials:Twilio";

    private readonly IOptionsMonitor<ContentLockOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IDisposable? _optionsChangeToken;

    public TwilioTurnCredentialProvider(
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

        var twilio = _options.CurrentValue.WebRTC.TurnServer.Twilio;

        var client = _httpClientFactory.CreateClient("Twilio");
        var basicCredential = Convert.ToBase64String(
            Encoding.ASCII.GetBytes($"{twilio.AccountSid}:{twilio.AuthToken}"));
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", basicCredential);

        var content = new FormUrlEncodedContent(
        [
            new KeyValuePair<string, string>("Ttl", twilio.Ttl.ToString()),
        ]);

        var response = await client.PostAsync(
            $"https://api.twilio.com/2010-04-01/Accounts/{twilio.AccountSid}/Tokens.json",
            content,
            ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TwilioResponse>(ct);
        if (result?.IceServers is null || result.IceServers.Length == 0)
            return [];

        var credentials = result.IceServers
            .Select(s => new TurnCredential(
                Urls: [s.Url],
                Username: s.Username,
                Credential: s.Credential))
            .ToArray();

        var cacheDuration = TimeSpan.FromSeconds(Math.Max(twilio.Ttl - 3600, 300));
        _cache.Set(CacheKey, credentials, cacheDuration);

        return credentials;
    }

    // ── Deserialization models ────────────────────────────────────────────

    private sealed class TwilioResponse
    {
        [JsonPropertyName("ice_servers")]
        public TwilioIceServer[] IceServers { get; set; } = [];
    }

    private sealed class TwilioIceServer
    {
        // Twilio returns singular "url", not "urls"
        [JsonPropertyName("url")]
        public string Url { get; set; } = "";

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("credential")]
        public string? Credential { get; set; }
    }
}
