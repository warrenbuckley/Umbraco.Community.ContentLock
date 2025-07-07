export default {
    contentLockDashboard: {
        label: 'Indholdslås',
        pageNameHeader: 'Sidenavn',
        contentTypeHeader: 'Indholdstype',
        checkedOutByHeader: 'Låst af',
        checkedOutAtHeader: 'Låst den',
        lastEditedHeader: 'Sidst redigeret',
        unlockAction: 'Lås op',
        pagesCheckedOutTitle: 'Låste sider',
        noLocks: 'Ingen låse',
        noLocksMessage: '🎉 Zip, zero, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'Denne side er låst af dig',
        lockedByAnother: 'Denne side er låst af {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Indhold låst',
        lockedMessage: 'Dokumentet er blevet låst, derfor kan du ikke redigere.',
        unlockedHeader: 'Indhold låst op',
        unlockedMessage: 'Dokumentet er blevet låst op, så andre brugere kan redigere det.',
        bulkUnlockHeader: 'Indhold låst op',
        bulkUnlockMessage: 'Det valgte indhold er blevet låst op',
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Unlocker',
        description: 'Giver brugergruppen mulighed for at låse et dokument op, som er låst af en anden bruger.',
    },
    contentLockUsersModal: {
        modalHeader: 'Who\'s online?',
        listOfUsers: 'Online Users',
        youLabel: 'Du',
    },
    contentLockViewingUsersModal: {
        modalHeader: 'Who\'s viewing this page?',
        listOfViewers: 'Users viewing this page',
    },
    contentLockViewingUsersFooterApp: {
        oneUserViewing: '1 other user viewing this page',
        multipleUsersViewing: '{0} other users viewing this page',
    },
    contentUnlockedModal: {
        modalHeader: 'Content Unlocked',
        modalContent: 'The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version',
        reload: 'Reload',
    }
};
