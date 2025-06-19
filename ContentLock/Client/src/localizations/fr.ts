export default {
    contentLockDashboard: {
        label: 'Verrouillage de contenu',
        pageNameHeader: 'Nom de la page',
        contentTypeHeader: 'Type de contenu',
        checkedOutByHeader: 'Verrouillé par',
        checkedOutAtHeader: 'Verrouillé le',
        lastEditedHeader: 'Dernière modification',
        unlockAction: 'Déverrouiller',
        pagesCheckedOutTitle: 'Pages verrouillées',
        noLocks: 'Aucun verrouillage',
        noLocksMessage: '🎉 Rien, zéro, nada'
    },
    contentLockFooterApp: {
        lockedByYou: 'Vous avez verrouillé cette page',
        lockedByAnother: 'Cette page est verrouillée par {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Contenu verrouillé',
        lockedMessage: 'Le document a été verrouillé afin que vous puissiez le modifier.',
        unlockedHeader: 'Contenu déverrouillé',
        unlockedMessage: 'Le document a été déverrouillé pour permettre à d’autres utilisateurs de le modifier.',
        bulkUnlockHeader: 'Contenu déverrouillé',
        bulkUnlockMessage: 'Le contenu sélectionné a été déverrouillé avec succès'
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Déverrouilleur',
        description: 'Permet au groupe d’utilisateurs de déverrouiller un document verrouillé par un autre utilisateur.',
    },
    contentLockUsersModal: {
        modalHeader: 'Qui est en ligne',
        listOfUsers: 'Utilisateurs en ligne',
        youLabel: 'Toi',
    },
    contentUnlockedModal: {
        modalHeader: 'Content Unlocked',
        modalContent: 'The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version',
        reload: 'Reload',
    }
};
