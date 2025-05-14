using Microsoft.Extensions.Logging;

namespace ContentLock.Options;

public class ContentLockOptions
{
    public const string ConfigName = "ContentLock";

    /// <summary>
    /// Settings related to the feature of showing the number of online users in the backoffice
    /// </summary>
    public OnlineUsersOptions OnlineUsers { get; set; } = new();
    
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
}
