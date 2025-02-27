using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace ContentLock.Models.Database
{
    [TableName(TableName)]
    [PrimaryKey("ContentKey", AutoIncrement = false)]
    [ExplicitColumns]
    public class ContentLocks
    {
        public const string TableName = "ContentLocks";

        [Column("ContentKey")]
        [PrimaryKeyColumn(AutoIncrement = false)]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        public Guid ContentKey { get; set; }

        [Column("UserKey")]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        public Guid UserKey { get; set; }
    }
}
