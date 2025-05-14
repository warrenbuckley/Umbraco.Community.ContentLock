export interface ContentLockOptions {
    onlineUsers: OnlineUsersOptions;
    signalRClientLogLevel: string;
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