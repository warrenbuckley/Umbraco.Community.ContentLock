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


## Options
Content Lock has the following options available to configure

## AppSettings

```json
...
"ContentLock": {
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

## Environment Variables
```
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
