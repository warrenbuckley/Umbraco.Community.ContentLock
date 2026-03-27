export interface ContentLockOptions {
    onlineUsers: OnlineUsersOptions;
    signalRClientLogLevel: string;
    webRTC: WebRTCOptions;
}

export interface OnlineUsersOptions {
    enable: boolean;
    sounds: OnlineUsersSoundsOptions;
}

export interface OnlineUsersSoundsOptions {
    enable: boolean;
    loginSound: string;
    logoutSound: string;
}

export interface WebRTCOptions {
    enable: boolean;
    stunServers: string[];
    ringTimeoutSeconds: number;
    sounds: WebRTCSoundsOptions;
    screenSharing: WebRTCScreenSharingOptions;
}

export interface WebRTCScreenSharingOptions {
    enable: boolean;
}

export interface WebRTCSoundsOptions {
    ringSound: string;
    ringbackSound: string;
}