---
title: Audio Calling
description: Peer-to-peer WebRTC audio calls between backoffice editors.
---

ContentLock includes a built-in peer-to-peer audio calling feature so backoffice editors can talk to each other without leaving Umbraco. Calls use **WebRTC** — a browser-native technology — meaning no external meeting software or server is required for editors on the same network.

:::note[Prerequisite]
Audio Calling requires the [Online Users](/features/online-users/) feature to be enabled.
:::

---

## Starting a Call

1. Click the **user count** in the header to open the **"Who's online?"** modal.
2. Find the editor you want to call.
3. Click the **Call** button next to their name.

The call button is hidden if:
- The target editor is already in another call (shows **"On a call"** instead).
- WebRTC calling is disabled in configuration.

---

## Call Flow

### Caller side

1. A **Calling…** state appears in the modal with the recipient's name.
2. A **ringback tone** plays while waiting for the recipient to answer.
3. If the recipient answers, the call connects. If they decline or don't answer within the ring timeout (default 20 seconds), the call ends with an appropriate notification.

### Recipient side

1. An **Incoming call** notification appears in the modal, showing the caller's name.
2. A **ringtone** plays to alert the recipient.
3. The recipient can click **Accept** or **Decline**.
   - **Accept** — connects the call.
   - **Decline** — the caller is notified immediately.
4. If the recipient doesn't answer within the ring timeout, the call is treated as a missed call.

### Connected state

Once connected:
- Both parties can hear each other via their microphone and speakers.
- **Mute / Unmute** — toggle your microphone.
- **Device Settings** — select which microphone and speaker to use (browser media device picker).
- **Hang Up** — end the call for both parties.

---

## Notifications

| Event | Shown to |
|---|---|
| Call declined | Caller — *"[Name] declined the call"* |
| Already on a call | Caller — *"[Name] is currently on another call"* |
| No answer (timeout) | Caller — *"Call failed to connect"*; Recipient — *"Missed call from [Name]"* |
| Call ended by other party | Remaining party — *"Call ended"* |

---

## Cross-Network Calls (TURN Servers)

WebRTC works well for editors on the **same local network** using only STUN servers (included by default). For editors on **different networks** (e.g., remote workers), a **TURN relay server** is required.

ContentLock supports three TURN server providers:

| Provider | Description |
|---|---|
| **None** (default) | STUN only — works on same network, free |
| **Cloudflare** | Cloudflare Calls TURN — pay-as-you-go |
| **Twilio** | Twilio Network Traversal Service |
| **Metered** | Metered TURN — free tier available |

See [WebRTC Configuration](/configuration/webrtc/) for setup instructions.

---

## Screenshot

![Audio call UI showing calling and connected states](../../../assets/screenshots/audio-call-ui.webp)

---

## Related

- [WebRTC Configuration](/configuration/webrtc/) — TURN servers, ring timeout, custom sounds
- [Online Users](/features/online-users/) — user presence required for calling
