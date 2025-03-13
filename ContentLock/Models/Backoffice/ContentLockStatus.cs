namespace ContentLock.Models.Backoffice
{
    public class ContentLockStatus
    {
        /// <summary>
        /// Is the content node locked
        /// </summary>
        public bool IsLocked { get; set; }

        /// <summary>
        /// The key of the user who locked the content
        /// </summary>
        public Guid LockedByKey { get; set; }

        /// <summary>
        /// The friendly name of the user who locked the content
        /// </summary>
        public string? LockedByName { get; set; }

        /// <summary>
        /// Is the content node locked by the current user
        /// </summary>
        public bool LockedBySelf { get; set; }

        /// <summary>
        /// Date/Time of when the node was locked
        /// </summary>
        public DateTime LockedAtDate { get; set; }
    }
}
