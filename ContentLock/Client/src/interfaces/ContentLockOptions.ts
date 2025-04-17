export interface ContentLockOptions {
    onlineUsers: OnlineUsersOptions;
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