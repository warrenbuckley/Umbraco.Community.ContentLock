namespace ContentLock.SignalR
{
    public class UserActivity
    {
        public Guid UserKey { get; set; }
        public string UserName { get; set; }
        public Guid? ActiveContentNodeKey { get; set; }
    }
}
