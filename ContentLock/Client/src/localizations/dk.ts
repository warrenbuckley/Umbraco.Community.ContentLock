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
    contentUnlockedModal: {
        modalHeader: 'Content Unlocked',
        modalContent: 'The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version',
        reload: 'Reload',
    },
    actionCategories: {
        contentLock: "Content Lock"
    },
    contentLockCall: {
        callButton: 'Ring op',
        busyIndicator: 'I opkald',
        incoming: 'Indgående opkald',
        accept: 'Accepter',
        decline: 'Afvis',
        hangUp: 'Læg på',
        mute: 'Slå lyd fra',
        unmute: 'Slå lyd til',
        deviceSettings: 'Lydenheder',
        microphone: 'Mikrofon',
        speaker: 'Højtaler',
        callEnded: 'Opkald afsluttet',
        callDeclined: '{0} afviste opkaldet',
        callBusy: '{0} er i øjeblikket i et opkald',
        callFailed: 'Opkaldet kunne ikke forbindes',
        calling: 'Ringer {0}...',
    }
};
