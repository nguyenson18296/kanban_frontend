interface IPresenceState {
  userId: string;
  isOnline: boolean;
  connectionCount: number;
  // ISO 8601 of the last online↔offline transition during current server
  // uptime. null = backend has no record (never connected, or restarted).
  lastChangedAt: string | null;
}

interface IPresenceListResponse {
  items: IPresenceState[];
}

interface IPresenceUpdate {
  userId: string;
  isOnline: boolean;
  connectionCount: number;
  // ISO 8601 of this specific transition (use as lastChangedAt in store).
  timestamp: string;
}

export type { IPresenceState, IPresenceListResponse, IPresenceUpdate };
