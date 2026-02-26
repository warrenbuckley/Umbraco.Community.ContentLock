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
    turnServers: WebRTCTurnServerOptions[];
    ringTimeoutSeconds: number;
}

export interface WebRTCTurnServerOptions {
    urls: string;
    username: string;
    credential: string;
}