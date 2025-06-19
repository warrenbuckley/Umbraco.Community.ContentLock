export default {
    contentLockDashboard: {
        label: 'Låst innhold',
        pageNameHeader: 'Sidenavn',
        contentTypeHeader: 'Innholdstype',
        checkedOutByHeader: 'Sjekket ut av',
        checkedOutAtHeader: 'Sjekket ut',
        lastEditedHeader: 'Sist redigert',
        unlockAction: 'Lås opp',
        pagesCheckedOutTitle: 'Låste sider',
        noLocks: 'Ingen låser',
        noLocksMessage: '🎉 Absolutt ingen ting'
    },
    contentLockFooterApp: {
        lockedByYou: 'Denne siden er låst av deg',
        lockedByAnother: 'Denne siden er låst av {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Innholdet er låst',
        lockedMessage: 'Dette dokumentet er låst slik at du kan redigere det.',
        unlockedHeader: 'Innhold låst opp',
        unlockedMessage: 'Dette dokumentet er låst opp slik at andre brukere kan redigere det.',
        bulkUnlockHeader: 'Innhold låst opp',
        bulkUnlockMessage: 'Valgt innhold er låst opp'
    },
    contentLockPermission: {
        group: 'Innholdslås', // TODO: Currently not used in Umbraco but added for future use
        label: 'Låsadministrator',
        description: 'Tillater en gruppe brukere å låse opp dokumenter som er låst av andre brukere.',
    },
    contentLockUsersModal: {
        modalHeader: 'Hvem er online?',
        listOfUsers: 'Online brukere',
        youLabel: 'Du',
    },
    contentUnlockedModal: {
        modalHeader: 'Content Unlocked',
        modalContent: 'The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version',
        reload: 'Reload',
    }
};
