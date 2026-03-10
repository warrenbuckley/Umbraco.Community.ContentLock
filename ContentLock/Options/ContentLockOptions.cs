namespace ContentLock.Options;

public class ContentLockOptions
{
    public const string ConfigName = "ContentLock";

    /// <summary>
    /// Settings related to the feature of showing the number of online users in the backoffice
    /// </summary>
    public OnlineUsersOptions OnlineUsers { get; set; } = new();

    /// <summary>
    /// Settings related to the WebRTC audio calling feature between backoffice users
    /// </summary>
    public WebRTCOptions WebRTC { get; set; } = new();
    
    /// <summary>
    /// Used to set the log level of the SignalR Javascript client
    /// </summary>
    /// <remarks>
    /// NOTE: This option is not reactively updated in the backoffice
    /// As we are unable to change the log level of the SignalR client once its booted up
    /// </remarks>
    public string SignalRClientLogLevel { get; set; } = "Info";
    
    public class OnlineUsersOptions
    {
        /// <summary>
        /// Enable or disable the online users feature.
        /// This is used to indicate the number of online users in the backoffice
        /// and displaying the names of the users
        /// By default this is enabled
        /// </summary>
        public bool Enable { get; set; } = true;

        /// <summary>
        /// Settings to control the sounds played when a user logs in or logs out
        /// </summary>
        public SoundsOptions Sounds { get; set; } = new();
        
        public class SoundsOptions
        {
            /// <summary>
            /// Enable or disable the audio notifications for a
            /// user logging in or out of the backoffice
            /// By default this feature is enabled
            /// </summary>
            public bool Enable { get; set; } = true;

            /// <summary>
            /// Path to the login sound file
            /// This can be a relative path or an absolute URL.
            /// </summary>
            public string LoginSound { get; set; } = "/App_Plugins/ContentLock/sounds/login.mp3";

            /// <summary>
            /// Path to the logout sound file.
            /// This can be a relative path or an absolute URL.
            /// </summary>
            public string LogoutSound { get; set; } = "/App_Plugins/ContentLock/sounds/logout.mp3";
        }
    }

    public class WebRTCOptions
    {
        /// <summary>
        /// Enable or disable the WebRTC audio calling feature.
        /// When disabled, the Call button is hidden from the online users modal.
        /// This setting is reactively applied without restart.
        /// </summary>
        public bool Enable { get; set; } = true;

        /// <summary>
        /// STUN server URLs used for ICE candidate gathering.
        /// Defaults to one Google and one Cloudflare FREE public STUN servers for provider diversity
        /// This should work for most network scenarios
        /// </summary>
        public string[] StunServers { get; set; } =
        [
            "stun:stun.l.google.com:19302",
            "stun:stun.cloudflare.com:3478"
        ];

        /// <summary>
        /// Optional TURN relay servers for environments where peer-to-peer connections
        /// cannot be established directly (e.g. symmetric NAT, strict corporate firewalls).
        /// Leave empty to rely on STUN only.
        /// Used by <see cref="TurnServerProviderOptions"/> when <c>Provider = "Static"</c>.
        /// </summary>
        public TurnServerOptions[] TurnServers { get; set; } = [];

        /// <summary>
        /// Dynamic TURN credential provider configuration.
        /// Changing <c>Provider</c> requires an application restart.
        /// Credential values (API keys) are reactive via <see cref="Microsoft.Extensions.Options.IOptionsMonitor{T}"/>.
        /// </summary>
        public TurnServerProviderOptions TurnServer { get; set; } = new();

        public class TurnServerProviderOptions
        {
            /// <summary>
            /// Which TURN credential provider to use.
            /// "None" = STUN only (default). "Static" = use TurnServers array.
            /// "Cloudflare" / "Twilio" = dynamic credentials via provider REST API.
            /// Changing this value requires an application restart.
            /// </summary>
            public string Provider { get; set; } = "None";

            public CloudflareOptions Cloudflare { get; set; } = new();
            public TwilioOptions Twilio { get; set; } = new();
            public MeteredOptions Metered { get; set; } = new();

            public class CloudflareOptions
            {
                /// <summary>TURN Key ID from Cloudflare Realtime dashboard.</summary>
                public string KeyId { get; set; } = "";

                /// <summary>API Token with TURN key permissions.</summary>
                public string ApiToken { get; set; } = "";

                /// <summary>Token lifetime in seconds. Maximum 86400 (24 hours).</summary>
                public int Ttl { get; set; } = 86400;
            }

            public class TwilioOptions
            {
                /// <summary>Twilio Account SID.</summary>
                public string AccountSid { get; set; } = "";

                /// <summary>Twilio Auth Token.</summary>
                public string AuthToken { get; set; } = "";

                /// <summary>Token lifetime in seconds.</summary>
                public int Ttl { get; set; } = 86400;
            }

            public class MeteredOptions
            {
                /// <summary>
                /// Your Metered app subdomain, e.g. "myapp" for myapp.metered.live.
                /// For the free Open Relay service use "openrelay".
                /// </summary>
                public string AppName { get; set; } = "openrelay";

                /// <summary>
                /// API key from the Metered dashboard.
                /// For the free Open Relay service use "openrelayproject".
                /// </summary>
                public string ApiKey { get; set; } = "";

                /// <summary>
                /// How long to cache the returned credentials in seconds.
                /// Metered credentials are valid for 24 hours; default caches for 23 hours.
                /// </summary>
                public int CacheTtlSeconds { get; set; } = 82800; // 23 hours
            }
        }

        /// <summary>
        /// Number of seconds to ring before automatically timing out.
        /// Read at call-offer time, so changes take effect on next call without restart.
        /// </summary>
        public int RingTimeoutSeconds { get; set; } = 20;

        /// <summary>
        /// Settings to control the sounds played during WebRTC calls.
        /// </summary>
        public SoundsOptions Sounds { get; set; } = new();

        public class SoundsOptions
        {
            /// <summary>
            /// Path to the audio file played on the callee's device while an incoming call is ringing.
            /// This can be a relative path or an absolute URL.
            /// Changes are reactively applied without a server restart.
            /// </summary>
            public string RingSound { get; set; } = "/App_Plugins/ContentLock/sounds/login.mp3";

            /// <summary>
            /// Path to the audio file played on the caller's device while waiting for the callee to answer.
            /// This can be a relative path or an absolute URL.
            /// Changes are reactively applied without a server restart.
            /// </summary>
            public string RingbackSound { get; set; } = "/App_Plugins/ContentLock/sounds/login.mp3";
        }

        public class TurnServerOptions
        {
            /// <summary>TURN server URL, e.g. "turn:turn.example.com:3478"</summary>
            public string Urls { get; set; } = "";

            /// <summary>TURN server username credential</summary>
            public string Username { get; set; } = "";

            /// <summary>TURN server password credential</summary>
            public string Credential { get; set; } = "";
        }
    }
}
