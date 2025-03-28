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
    },
    contentLockFooterApp: {
        lockedByYou: 'Cette page est verrouillée par vous',
        lockedByAnother: 'Cette page est verrouillée par {0}',
    },
    contentLockNotification: {
        lockedHeader: 'Contenu verrouillé',
        lockedMessage: 'Le document a été verrouillé pour que vous puissiez le modifier.',
        unlockedHeader: 'Contenu déverrouillé',
        unlockedMessage: 'Le document a été déverrouillé pour permettre à d’autres utilisateurs de le modifier.',
        bulkUnlockHeader: 'Contenu déverrouillé',
        bulkUnlockMessage: 'Le contenu sélectionné a été déverrouillé avec succès'
    },
    contentLockPermission: {
        group: 'Content Lock', // TODO: Currently not used in Umbraco but added for future use
        label: 'Unlocker',
        description: 'Permet au groupe d’utilisateurs de déverrouiller un document verrouillé par un autre utilisateur.',
    },
};