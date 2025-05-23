export default {
    contentLockDashboard: {
        label: 'Content Lock',
        pageNameHeader: 'Page Name',
        contentTypeHeader: 'Content Type',
        checkedOutByHeader: 'Checked Out By',
        checkedOutAtHeader: 'Checked Out At',
        lastEditedHeader: 'Last Edited',
        unlockAction: 'Unlock',
        pagesCheckedOutTitle: 'Pages Checked Out',
        noLocks: 'No locks',
        noLocksMessage: '🎉 Zip, zero, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'This page is locked by you',
        lockedByAnother: 'This page is locked by {0}',
        alsoViewing: 'Also viewing',
        others: 'others', // Simple plural, consider Umbraco's pluralization for better handling if available
    },
    contentLockNotification: {
        lockedHeader: 'Content Locked',
        lockedMessage: 'The document has been locked for you to edit.',
        unlockedHeader: 'Content Unlocked',
        unlockedMessage: 'The document has been unlocked, to allow other users to edit.',
        bulkUnlockHeader: 'Content Unlocked',
        bulkUnlockMessage: 'The selected content has been unlocked successfully'
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Unlocker',
        description: 'Allows the group of users to unlock a document that is locked by another user.',
    },
    contentLockUsersModal: {
        modalHeader: 'Who\'s online?',
        listOfUsers: 'Online Users'
    }
};