# Umbraco Community ContentLock

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NuGet version](https://img.shields.io/nuget/v/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)

**Umbraco Community ContentLock** is an open-source package for [Umbraco CMS](https://umbraco.com/) that prevents content conflicts by enabling content editors to lock nodes while editing. This ensures that changes are made by a single user at a time, reducing the risk of overwriting each other’s work.

## Features

- **Intuitive Lock/Unlock Actions:**  
  - Lock or unlock content nodes directly from the node actions (top right) or the tree view.
  
- **Comprehensive Audit Trail:**  
  - Every lock and unlock action is logged in the node history for complete traceability.
  
- **Enhanced Permission Management:**  
  - Introduces new permissions that allow users to override locks when needed
  - New permission is added to the Administrators user group when first installed
  
- **Dashboard Overview:**  
  - Access a dedicated dashboard in the content section to view all currently locked nodes.
  - Users with permission can override one or more locked nodes from this dashboard
  
- **User Notifications:**  
  - Users are informed via a footer message when a node is locked.
  
- **Read-Only Mode for Locked Nodes:**  
  - Locked nodes display all content (across all variants) as read-only.
  
- **Action Restrictions:**  
  - Prevents actions like publish, unpublish, and save for nodes that are currently locked.


Trace
Debug
Information or Info
Warning or Warn
Error
Critical
None

## Options
Content Lock has the following options available to configure. 

| Setting | Description | Default Value |
| -- | -- | -- |
| SignalRClientLogLevel | The SignalR log level of printing messages to the browser console can be set as one of the following values. `Trace`, `Debug`, `Information` or `Info`, `Warning` or `Warn`, `Error`, `Critical` and `None` | `"Info"` |
| OnlineUsers.Enable | A boolean flag to decide if to displays a header app in the top right with the number of active users connected to the Umbraco backoffice | true
| OnlineUsers.Sounds.Enable | A boolean flag to decide if to play audio notifications when a user logs in or out of the backoffice | true
| OnlineUsers.Sounds.LoginSound | A path to an audio file that a browser can play when a new user logins to the Umbraco backoffice | `"/App_Plugins/ContentLock/sounds/login.mp3"`
| OnlineUsers.Sounds.LogoutSound | A path to an audio file that a browser can play when a user logs out of the Umbraco backoffice | `"/App_Plugins/ContentLock/sounds/logout.mp3"`

### Reactive Options
Changing any of these options will be changed instantly without having to redeploy or restart the application. For example you could change the value **OnlineUsers.Enable** and this will instantly toggle the number of connected users in the backoffice in the top right of Umbraco.

You can see this in action here and how it was coded if you are curious: 

[![How to use SignalR with Umbraco for real-time options](https://img.youtube.com/vi/MZfeUKSO8h4/0.jpg)](https://www.youtube.com/watch?v=MZfeUKSO8h4)


### AppSettings

```json
...
"ContentLock": {
  "SignalRClientLogLevel": "Info",
  "OnlineUsers": {
    "Enable": true,
    "Sounds": {
      "Enable": true,
      "LoginSound":"/App_Plugins/ContentLock/sounds/login.mp3",
      "LogoutSound":"/App_Plugins/ContentLock/sounds/logout.mp3"
    }
  }
}
```

### Environment Variables
```
ContentLock__SignalRClientLogLevel=Trace
ContentLock__OnlineUsers__Enable=true
ContentLock__OnlineUsers__Sounds__Enable=true
ContentLock__OnlineUsers__Sounds__LoginSound=https://some-snazzy-sound.com/sfx-login.mp3
ContentLock__OnlineUsers__Sounds__LogoutSound=/App_Plugins/SomePlace/logout.mp3
```

---

### Attributions
* Log on sound: Piano Notification 3 by FoolBoyMedia
  * https://freesound.org/s/352651/
  * License: Attribution NonCommercial 4.0
* Log off sound: Dist Kalimba.wav by JFRecords
  * https://freesound.org/s/420521/
  * License: Attribution 3.0

---

### Fork Notice
This package is a community-driven fork of the original [CogWorks ContentGuard](https://github.com/thecogworks/Cogworks.ContentGuard) project, modified for the modern Umbraco Bellissima backoffice. Special thanks to the team at CogWorks and the original developer [Marcin Zajkowski](https://github.com/mzajkowski) for laying the groundwork and supporting this update.

---

_Lovingly crafted for you by [Warren Buckley](https://github.com/sponsors/warrenbuckley) ❤️_

_[Available for hire](https://hackmakedo.com/)_
