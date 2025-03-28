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
        label: 'Unlocker',
        description: 'Staat de gebruikersgroep toe om een document te ontgrendelen dat door een andere gebruiker is vergrendeld.',
    },
};