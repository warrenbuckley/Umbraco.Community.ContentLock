export default {
    contentLock: {
        sampleNumberOfItems: (count: any) => {
            count = parseInt(count, 10);
            if (count === 0) return 'Showing nothing';
            if (count === 1) return 'Showing only one item';
            return `Showing ${count} items`;
        },
    },
    contentLockDashboard: {
        label: 'Content Lock',
        pageNameHeader: 'Page Name U',
        contentTypeHeader: 'Content Type 🎁',
        checkedOutByHeader: 'Checked Out By WARREN',
        checkedOutAtHeader: 'Checked Out At WA',
        lastEditedHeader: 'Last Edited ❤️',
        unlockAction: 'Unlock MEEEE',
        pagesCheckedOutTitle: 'Pages Checked Out 🤮',
    }
};