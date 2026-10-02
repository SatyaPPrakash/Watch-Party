export interface Peer {
  id: string;
  displayName: string;
  cameraOn: boolean;
  micOn: boolean;
}

export interface RoomSnapshot {
  code: string;
  peers: Peer[];
}

export type PlaybackState = "playing" | "paused";

export interface SyncPayload {
  state: PlaybackState;
  currentTime: number;
  timestamp: number;
}

export interface ServerToClientEvents {
  "room:joined": (payload: { room: RoomSnapshot; peer: Peer }) => void;
  "room:peer-joined": (peer: Peer) => void;
  "room:peer-left": (peerId: string) => void;
  "room:peer-updated": (peer: Peer) => void;
  "room:error": (message: string) => void;
  signal: (payload: { from: string; signal: unknown }) => void;
  "sync:state": (payload: SyncPayload) => void;
  "sync:controller-changed": (peerId: string) => void;
}

export interface ClientToServerEvents {
  "room:create": (displayName: string, cb: (code: string) => void) => void;
  "room:join": (payload: { code: string; displayName: string }, cb: (err: string | null) => void) => void;
  "room:toggle-camera": (cameraOn: boolean) => void;
  "room:toggle-mic": (micOn: boolean) => void;
  signal: (payload: { to: string; signal: unknown }) => void;
  "sync:update": (payload: SyncPayload) => void;
  "sync:request-state": () => void;
  "sync:set-controller": (peerId: string) => void;
}