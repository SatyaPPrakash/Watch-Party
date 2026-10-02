export interface Peer {
  id: string;
  displayName: string;
  cameraOn: boolean;
  micOn: boolean;
}

export interface Room {
  code: string;
  peers: Map<string, Peer>;
  screenSharerId: string | null;
  createdAt: number;
}

export type PlaybackState = "playing" | "paused";
export type PlaybackAction = "play" | "pause";

export interface SyncPayload {
  state: PlaybackState;
  currentTime: number;
  timestamp: number;
}

export interface ClientToServerEvents {
  "room:create": (displayName: string, cb: (code: string) => void) => void;
  "room:join": (payload: { code: string; displayName: string }, cb: (err: string | null) => void) => void;
  "room:toggle-camera": (cameraOn: boolean) => void;
  "room:toggle-mic": (micOn: boolean) => void;
  "room:remote-mute": (targetId: string) => void;
  "room:remote-hide-camera": (targetId: string) => void;
  "room:screen-share": (isSharing: boolean) => void;
  "signal": (payload: { to: string; signal: unknown }) => void;
  "sync:update": (payload: SyncPayload) => void;
  "sync:playback-request": (action: PlaybackAction) => void;
  "sync:request-state": () => void;
  "sync:set-controller": (peerId: string) => void;
  "sync:load-url": (url: string) => void;
}

export interface ServerToClientEvents {
  "room:joined": (payload: { room: RoomSnapshot; peer: Peer }) => void;
  "room:peer-joined": (peer: Peer) => void;
  "room:peer-left": (peerId: string) => void;
  "room:peer-updated": (peer: Peer) => void;
  "room:error": (message: string) => void;
  "room:you-were-muted": () => void;
  "room:your-camera-was-hidden": () => void;
  "room:screen-share-changed": (peerId: string | null) => void;
  "signal": (payload: { from: string; signal: unknown }) => void;
  "sync:state": (payload: SyncPayload) => void;
  "sync:playback-request": (action: PlaybackAction) => void;
  "sync:controller-changed": (peerId: string) => void;
  "sync:load-url": (url: string) => void;
  "upload:progress": (payload: { jobId: string; percent: number; status: string }) => void;
  "upload:ready": (payload: { jobId: string; hlsUrl: string }) => void;
  "upload:error": (payload: { jobId: string; message: string }) => void;
}

export interface RoomSnapshot {
  code: string;
  peers: Peer[];
  screenSharerId: string | null;
}