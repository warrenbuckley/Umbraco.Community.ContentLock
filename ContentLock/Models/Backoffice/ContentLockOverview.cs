namespace ContentLock.Models.Backoffice
{
    public class ContentLockOverview
    {
        public int TotalResults { get; set; }

        public required List<ContentLockOverviewItem> Items { get; set; }
    }

    public class ContentLockOverviewItem
    {
        public Guid Key { get; set; }

        public required string NodeName { get; set; }

        public required string ContentType { get; set; }

        public required string CheckedOutBy { get; set; }

        public Guid CheckedOutByKey { get; set; }

        public DateTime LastEdited { get; set; }

        public DateTime LockedAtDate { get; set; }
    }
}
