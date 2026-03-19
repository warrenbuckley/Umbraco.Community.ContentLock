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

|  Key                                     | Value                                                                                                                                                      |
|------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| contentUnlockedModal.modalHeader         | Content Unlocked                                                                                                                                           |
| contentUnlockedModal.modalContent        | The content is now unlocked and available for editing, however it may have been modified by another user. Please reload the page to see the latest version |
| contentUnlockedModal.reload              | Reload                                                                                                                                                     |

### Action Categories

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| actionCategories.contentLock             | Content Lock                                                         |

### Calling

|  Key                                     | Value                                                                |
|------------------------------------------|----------------------------------------------------------------------|
| contentLockCall.callButton               | Call                                                                 |
| contentLockCall.busyIndicator            | On a call                                                            |
| contentLockCall.incoming                 | Incoming call                                                        |
| contentLockCall.accept                   | Accept                                                               |
| contentLockCall.decline                  | Decline                                                              |
| contentLockCall.hangUp                   | Hang Up                                                              |
| contentLockCall.mute                     | Mute                                                                 |
| contentLockCall.unmute                   | Unmute                                                               |
| contentLockCall.deviceSettings           | Audio devices                                                        |
| contentLockCall.microphone               | Microphone                                                           |
| contentLockCall.speaker                  | Speaker                                                              |
| contentLockCall.callEnded                | Call ended                                                           |
| contentLockCall.callDeclined             | {0} declined the call                                                |
| contentLockCall.callBusy                 | {0} is currently on another call                                     |
| contentLockCall.callFailed               | Call failed to connect                                               |
| contentLockCall.calling                  | Calling {0}...                                                       |
| contentLockCall.missedCall               | Missed call                                                          |
| contentLockCall.missedCallFrom           | {0} tried to call you                                                |

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
    }
};
```
