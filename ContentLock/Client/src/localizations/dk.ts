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
        callButton: 'Call',
        busyIndicator: 'On a call',
        incoming: 'Incoming call',
        accept: 'Accept',
        decline: 'Decline',
        hangUp: 'Hang Up',
        mute: 'Mute',
        unmute: 'Unmute',
        deviceSettings: 'Audio devices',
        microphone: 'Microphone',
        speaker: 'Speaker',
        callEnded: 'Call ended',
        callDeclined: '{0} declined the call',
        callBusy: '{0} is currently on another call',
        callFailed: 'Call failed to connect',
        calling: 'Calling {0}...',
        missedCall: 'Missed call',
        missedCallFrom: '{0} tried to call you',
    }
};
