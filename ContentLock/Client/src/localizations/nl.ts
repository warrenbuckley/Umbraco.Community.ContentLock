export default {
    contentLockDashboard: {
        label: 'Inhoudsvergrendeling',
        pageNameHeader: 'Paginanaam',
        contentTypeHeader: 'Inhoudstype',
        checkedOutByHeader: 'Vergrendeld door',
        checkedOutAtHeader: 'Vergrendeld op',
        lastEditedHeader: 'Laatst bewerkt',
        unlockAction: 'Ontgrendelen',
        pagesCheckedOutTitle: 'Vergrendelde pagina’s',
        noLocks: 'Geen grendel',
        noLocksMessage: '🎉 Niets, zero, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'Deze pagina is door jou vergrendeld',
        lockedByAnother: 'Deze pagina is vergrendeld door {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Inhoud vergrendeld',
        lockedMessage: 'Het document is vergrendeld zodat je het kunt bewerken.',
        unlockedHeader: 'Inhoud ontgrendeld',
        unlockedMessage: 'Het document is ontgrendeld zodat andere gebruikers het kunnen bewerken.',
        bulkUnlockHeader: 'Inhoud ontgrendeld',
        bulkUnlockMessage: 'De geselecteerde inhoud is succesvol ontgrendeld',
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Ontgrendelaar',
        description: 'Staat de gebruikersgroep toe om een document te ontgrendelen dat door een andere gebruiker is vergrendeld.',
    },
    contentLockUsersModal: {
        modalHeader: 'Wie is online?',
        listOfUsers: 'Online Gebruikers',
        youLabel: 'Jij',
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
