export default {
    contentLockDashboard: {
        label: 'Clo Cynnwys',
        pageNameHeader: 'Enw\'r Dudalen',
        contentTypeHeader: 'Math o Gynnwys',
        checkedOutByHeader: 'Wedi\'i Wirio Allan Gan',
        checkedOutAtHeader: 'Wedi\'i Wirio Allan Ar',
        lastEditedHeader: 'Golygiad Diwethaf',
        unlockAction: 'Datgloi',
        pagesCheckedOutTitle: 'Tudalennau wedi\'u Gwirio Allan',
        noLocks: 'Dim cloeon',
        noLocksMessage: '🎉 Dim, sero, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'Mae\'r dudalen hon wedi\'i chloi gennych chi',
        lockedByAnother: 'Mae\'r dudalen hon wedi\'i chloi gan {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Cynnwys wedi\'i Gloi',
        lockedMessage: 'Mae\'r ddogfen wedi\'i chloi er mwyn i chi ei golygu.',
        unlockedHeader: 'Cynnwys wedi\'i Ddatgloi',
        unlockedMessage: 'Mae\'r ddogfen wedi\'i datgloi i ganiatáu i ddefnyddwyr eraill ei golygu.',
        bulkUnlockHeader: 'Cynnwys wedi\'i Ddatgloi',
        bulkUnlockMessage: 'Mae\'r cynnwys a ddewiswyd wedi\'i ddatgloi\'n llwyddiannus',
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Unlocker',
        description: 'Yn caniatáu i\'r grŵp o ddefnyddwyr ddatgloi dogfen sydd wedi\'i chloi gan ddefnyddiwr arall.',
    },
    contentLockUsersModal: {
        modalHeader: 'Pwy sy\'n ar-lein?',
        listOfUsers: 'Defnyddwyr Ar-lein',
        youLabel: 'Ti',
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
