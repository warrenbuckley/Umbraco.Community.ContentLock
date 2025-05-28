# JS Translations of the Content Lock UI
These files are used to translate the UI of Content Lock in the Umbraco backoffice

## Resources
https://docs.umbraco.com/umbraco-cms/customizing/foundation/localization

https://docs.umbraco.com/umbraco-cms/customizing/extending-overview/extension-types/localization

https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-custom-dashboard/adding-localization-to-the-dashboard

## Translations

### Dashboard

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockDashboard.label               | Content Lock                                                         |
| contentLockDashboard.pageNameHeader      | Page Name                                                            |
| contentLockDashboard.contentTypeHeader   | Content Type                                                         |
| contentLockDashboard.checkedOutByHeader  | Checked Out By                                                       |
| contentLockDashboard.checkedOutAtHeader  | Checked Out At                                                       |
| contentLockDashboard.lastEditedHeader    | Last Edited                                                          |
| contentLockDashboard.unlockAction        | Unlock                                                               |
| contentLockDashboard.pagesCheckedOutTitle| Pages Checked Out                                                    |
| contentLockDashboard.noLocks             | No locks                                                             |
| contentLockDashboard.noLocksMessage      | 🎉 Zip, zero, nada                                                   |

### Footer App

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockFooterApp.lockedByYou         | This page is locked by you                                           |
| contentLockFooterApp.lockedByAnother     | This page is locked by {0}                                           |

### Notifications

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockNotification.lockedHeader     | Content Locked                                                       |
| contentLockNotification.lockedMessage    | The document has been locked for you to edit.                        |
| contentLockNotification.unlockedHeader   | Content Unlocked                                                     |
| contentLockNotification.unlockedMessage  | The document has been unlocked, to allow other users to edit.        |
| contentLockNotification.bulkUnlockHeader | Content Unlocked                                                     |
| contentLockNotification.bulkUnlockMessage| The selected content has been unlocked successfully                  |

### User Group Permission

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockPermission.group              | Content Lock                                                         |
| contentLockPermission.label              | Unlocker                                                             |
| contentLockPermission.description        | Allows the group of users to unlock a document that is locked by another user. |

### Modals

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockUsersModal.modalHeader        | Who's online?                                                        |
| contentLockUsersModal.listOfUsers        | Online Users                                                         |
| contentLockUsersModal.youLabel           | You                                                                  |


### en.ts
```ts
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
    }
};
```
