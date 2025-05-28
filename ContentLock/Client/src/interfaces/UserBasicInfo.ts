export interface UserBasicInfo {
  userKey: string;
  userName: string;
}

export interface ServerUserActivity {
  UserKey: string; 
  UserName: string;
  ActiveContentNodeKey?: string | null; // Guid can be null, string representation of Guid
}
