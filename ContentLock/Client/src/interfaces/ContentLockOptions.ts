export interface ContentLockOptions {
    onlineUsers: OnlineUsersOptions;
    signalRClientLogLevel: string;
    webRTC: WebRTCOptions;
    autoLock: AutoLockOptions;
}

export interface AutoLockOptions {
    enable: boolean;
    inactivityTimeoutSeconds: number;
    heartbeatSeconds: number;
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
}

export interface WebRTCSoundsOptions {
    ringSound: string;
    ringbackSound: string;
}