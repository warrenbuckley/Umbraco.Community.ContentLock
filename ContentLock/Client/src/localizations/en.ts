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
        listOfUsers: 'Online Users',
        youLabel: 'You',
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
        calling: 'Calling',
        missedCall: 'Missed call',
        missedCallFrom: '{0} tried to call you',
        shareScreen: 'Share Screen',
        stopSharing: 'Stop Sharing',
        sharingScreen: '{0} is sharing their screen',
        viewScreen: 'View Screen',
        screenShareEnded: 'Screen share ended',
        draw: 'Draw',
        stopDraw: 'Stop Drawing',
    }
};