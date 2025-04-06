namespace ContentLock.Options;

public class ContentLockOptions
{
    public const string ConfigName = "ContentLock";
    
    /// <summary>
    /// Enable or disable the online users feature
    /// This is used to indicate the number of online users in the backoffice
    /// with displaying the names of the users
    /// By default this is enabled
    /// </summary>
    public bool EnableOnlineUsers { get; set; } = true;
    
    /// <summary>
    /// Enable ot disable the audio notifications for a
    /// user logging in or off of the backoffice
    /// By default this is enabled
    /// </summary>
    public bool EnableSounds { get; set; } = true; 
}
