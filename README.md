# Umbraco Community ContentLock

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NuGet version](https://img.shields.io/nuget/v/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)
[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.ContentLock.svg)](https://www.nuget.org/packages/Umbraco.Community.ContentLock)
![Contributors](https://img.shields.io/github/contributors/warrenbuckley/Umbraco.Community.ContentLock)

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

- **Audio Calling** _(17.1.0+)_**:**
  - Peer-to-peer WebRTC voice calls between backoffice editors directly from the Online Users modal.
  - No external software required for editors on the same network; TURN server support available for remote workers.

## Options
Content Lock has the following options available to configure. 

| Setting | Description | Default Value |
| -- | -- | -- |
| SignalRClientLogLevel | The SignalR log level for browser console output. One of: `Trace`, `Debug`, `Information`/`Info`, `Warning`/`Warn`, `Error`, `Critical`, `None` | `"Info"` |
| OnlineUsers.Enable | Displays a header app showing the number of active backoffice users | `true` |
| OnlineUsers.Sounds.Enable | Play audio notifications when a user logs in or out of the backoffice | `true` |
| OnlineUsers.Sounds.LoginSound | Path to the audio file played when a user logs in | `"/App_Plugins/ContentLock/sounds/login.mp3"` |
| OnlineUsers.Sounds.LogoutSound | Path to the audio file played when a user logs out | `"/App_Plugins/ContentLock/sounds/logout.mp3"` |
| WebRTC.Enable | Enable or disable the peer-to-peer audio calling feature. Reactive — no restart needed | `true` |
| WebRTC.RingTimeoutSeconds | Seconds to ring before automatically ending an unanswered call  | `20` |
| WebRTC.StunServers | STUN server URLs used for WebRTC ICE negotiation | Google + Cloudflare public servers |
| WebRTC.Sounds.RingSound | Audio file played on the recipient's device for incoming calls | `"/App_Plugins/ContentLock/sounds/ringtone.mp3"` |
| WebRTC.Sounds.RingbackSound | Audio file played on the caller's device while waiting for an answer | `"/App_Plugins/ContentLock/sounds/ringtone.mp3"` |
| WebRTC.TurnServer.Provider | TURN provider for cross-network calls. One of: `None`, `Cloudflare`, `Twilio`, `Metered` | `"None"` |

### AppSettings

```json
...
"ContentLock": {
  "SignalRClientLogLevel": "Info",
  "OnlineUsers": {
    "Enable": true,
    "Sounds": {
      "Enable": true,
      "LoginSound": "/App_Plugins/ContentLock/sounds/login.mp3",
      "LogoutSound": "/App_Plugins/ContentLock/sounds/logout.mp3"
    }
  },
  "WebRTC": {
    "Enable": true,
    "StunServers": [
      "stun:stun.l.google.com:19302",
      "stun:stun.cloudflare.com:3478"
    ],
    "RingTimeoutSeconds": 20,
    "TurnServer": {
      "Provider": "None"
    },
    "Sounds": {
      "RingSound": "/App_Plugins/ContentLock/sounds/ringtone.mp3",
      "RingbackSound": "/App_Plugins/ContentLock/sounds/ringtone.mp3"
    }
  }
}
```

### Environment Variables
```
ContentLock__SignalRClientLogLevel=Info
ContentLock__OnlineUsers__Enable=true
ContentLock__OnlineUsers__Sounds__Enable=true
ContentLock__OnlineUsers__Sounds__LoginSound=https://some-snazzy-sound.com/sfx-login.mp3
ContentLock__OnlineUsers__Sounds__LogoutSound=/App_Plugins/SomePlace/logout.mp3
ContentLock__WebRTC__Enable=true
ContentLock__WebRTC__RingTimeoutSeconds=20
ContentLock__WebRTC__TurnServer__Provider=None
ContentLock__WebRTC__TurnServer__Sounds__RingSound=/App_Plugins/ContentLock/sounds/ringtone.mp3
ContentLock__WebRTC__TurnServer__Sounds__RingbackSound=/App_Plugins/ContentLock/sounds/ringtone.mp3
```

### Reactive Options

> [!TIP]
> Changing any of these options will be changed **instantly** without having to redeploy or restart the application.

For example you could change the value **OnlineUsers.Enable** and this will instantly toggle the number of connected users in the backoffice in the top right of Umbraco.
You can see this in action here and [how it was coded](https://blog.hackmakedo.com/2025/04/28/using-signalr-ioptionsmonitor-with-umbraco-bellissima-for-reactive-net-options/) if you are curious:

[![How to use SignalR with Umbraco for real-time options](https://img.youtube.com/vi/MZfeUKSO8h4/0.jpg)](https://www.youtube.com/watch?v=MZfeUKSO8h4)


---

### Attributions
* Log on sound: Piano Notification 3 by FoolBoyMedia
  * https://freesound.org/s/352651/
  * License: Attribution NonCommercial 4.0
* Log off sound: Dist Kalimba.wav by JFRecords
  * https://freesound.org/s/420521/
  * License: Attribution 3.0
* Ringtone sound: Piano Notification 5b by FoolBoyMedia
  * https://freesound.org/s/352654/
  * License: Attribution NonCommercial 4.0

---

### Fork Notice
This package is a community-driven fork of the original [CogWorks ContentGuard](https://github.com/thecogworks/Cogworks.ContentGuard) project, modified for the modern Umbraco Bellissima backoffice. Special thanks to the team at CogWorks and the original developer [Marcin Zajkowski](https://github.com/mzajkowski) for laying the groundwork and supporting this update.

---

_Lovingly crafted for you by [Warren Buckley](https://github.com/sponsors/warrenbuckley) ❤️_

_[Available for hire](https://hackmakedo.com/)_
