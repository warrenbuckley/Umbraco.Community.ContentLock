export default {
    contentLockDashboard: {
        label: 'Blocco contenuti',
        pageNameHeader: 'Nome della pagina',
        contentTypeHeader: 'Tipo di contenuto',
        checkedOutByHeader: 'Bloccato da',
        checkedOutAtHeader: 'Bloccato il',
        lastEditedHeader: 'Ultima modifica',
        unlockAction: 'Sblocca',
        pagesCheckedOutTitle: 'Pagine bloccate',
        noLocks: 'No locks',
        noLocksMessage: '🎉 Zip, zero, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'Questa pagina è bloccata da te',
        lockedByAnother: 'Questa pagina è bloccata da {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Contenuto bloccato',
        lockedMessage: 'Il documento è stato bloccato per permetterti di modificarlo.',
        unlockedHeader: 'Contenuto sbloccato',
        unlockedMessage: 'Il documento è stato sbloccato per consentire ad altri utenti di modificarlo.',
        bulkUnlockHeader: 'Contenuto sbloccato',
        bulkUnlockMessage: 'Il contenuto selezionato è stato sbloccato con successo',
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Unlocker',
        description: 'Consente al gruppo di utenti di sbloccare un documento bloccato da un altro utente.',
    },
    contentLockUsersModal: {
        modalHeader: 'Who\'s online?',
        listOfUsers: 'Online Users',
        youLabel: 'Voi',
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
 