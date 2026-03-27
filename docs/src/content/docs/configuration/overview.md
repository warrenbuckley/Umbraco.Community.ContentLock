---
title: Configuration Overview
description: Full appsettings reference for all ContentLock options.
---

All ContentLock settings live under the `ContentLock` key in `appsettings.json`. Most settings are **reactively applied** — changing them takes effect immediately without restarting the application (pushed to all clients via SignalR). Exceptions are noted below.

---

## Full Configuration Example

```json
{
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
      "Sounds": {
        "RingSound": "/App_Plugins/ContentLock/sounds/ringtone.mp3",
        "RingbackSound": "/App_Plugins/ContentLock/sounds/ringtone.mp3"
      },
      "TurnServer": {
        "Provider": "None"
      }
    }
  }
}
```

---

## Options Reference

### Root

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `SignalRClientLogLevel` | `string` | `"Info"` | ❌ No | Log level for the SignalR JavaScript client. Valid values: `Trace`, `Debug`, `Information`, `Warning`, `Error`, `Critical`, `None`. Requires a page reload to take effect. |

---

### OnlineUsers

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `OnlineUsers.Enable` | `bool` | `true` | ✅ Yes | Show/hide the online users header app and modal. |
| `OnlineUsers.Sounds.Enable` | `bool` | `true` | ✅ Yes | Play audio when editors connect or disconnect. |
| `OnlineUsers.Sounds.LoginSound` | `string` | `"/App_Plugins/ContentLock/sounds/login.mp3"` | ✅ Yes | Path or URL to the login notification sound. |
| `OnlineUsers.Sounds.LogoutSound` | `string` | `"/App_Plugins/ContentLock/sounds/logout.mp3"` | ✅ Yes | Path or URL to the logout notification sound. |

---

### WebRTC

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `WebRTC.Enable` | `bool` | `true` | ✅ Yes | Show/hide the Call button in the online users modal. |
| `WebRTC.StunServers` | `string[]` | Google + Cloudflare STUN | ✅ Yes | List of STUN server URLs for ICE candidate gathering. |
| `WebRTC.RingTimeoutSeconds` | `int` | `20` | ✅ Yes | How long to ring before treating the call as no answer. Range: 5–120. |
| `WebRTC.Sounds.RingSound` | `string` | `"…/ringtone.mp3"` | ✅ Yes | Audio played on the recipient's device for an incoming call. |
| `WebRTC.Sounds.RingbackSound` | `string` | `"…/ringtone.mp3"` | ✅ Yes | Audio played on the caller's device while waiting for an answer. |
| `WebRTC.TurnServer.Provider` | `string` | `"None"` | ❌ No | TURN provider: `None`, `Cloudflare`, `Twilio`, or `Metered`. **Requires restart to change.** |

---

### WebRTC TURN — Cloudflare

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `TurnServer.Cloudflare.KeyId` | `string` | `""` | ✅ Yes | TURN Key ID from the Cloudflare Realtime dashboard. |
| `TurnServer.Cloudflare.ApiToken` | `string` | `""` | ✅ Yes | API Token with TURN key permissions. |
| `TurnServer.Cloudflare.Ttl` | `int` | `86400` | ✅ Yes | Credential lifetime in seconds (max 86400 / 24 hours). |

---

### WebRTC TURN — Twilio

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `TurnServer.Twilio.AccountSid` | `string` | `""` | ✅ Yes | Twilio Account SID. |
| `TurnServer.Twilio.AuthToken` | `string` | `""` | ✅ Yes | Twilio Auth Token. |
| `TurnServer.Twilio.Ttl` | `int` | `86400` | ✅ Yes | Token lifetime in seconds. |

---

### WebRTC TURN — Metered

| Option | Type | Default | Reactive | Description |
|---|---|---|---|---|
| `TurnServer.Metered.AppName` | `string` | `""` | ✅ Yes | Your Metered app subdomain (e.g. `"myapp"` for `myapp.metered.live`). |
| `TurnServer.Metered.ApiKey` | `string` | `""` | ✅ Yes | API key from the Metered dashboard. |
| `TurnServer.Metered.CacheTtlSeconds` | `int` | `82800` | ✅ Yes | How long to cache credentials (default 23 hours; Metered credentials are valid for 24 hours). |

---

## Environment Variables

All options can also be set via environment variables using the standard .NET configuration provider format, replacing `:` with `__`:

```
ContentLock__OnlineUsers__Enable=false
ContentLock__WebRTC__TurnServer__Provider=Cloudflare
ContentLock__WebRTC__TurnServer__Cloudflare__KeyId=your-key-id
ContentLock__WebRTC__TurnServer__Cloudflare__ApiToken=your-api-token
```

---

## Related

- [Online Users Configuration](/configuration/online-users/) — sounds deep-dive
- [WebRTC Configuration](/configuration/webrtc/) — TURN server setup guide
