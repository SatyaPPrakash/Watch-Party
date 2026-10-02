# Progress

## Checkpoint Status

| # | Name | Status | Notes |
|---|---|---|---|
| 1 | Room shell | ✅ Implemented — manual verification pending | Rooms, media tiles, WebRTC mesh, controls, responsive layouts |
| 2 | Direct Playback | 🟡 Core implementation present — manual verification pending | MP4/HLS player, URL broadcast, sync engine, drift correction |
| 3 | Upload → HLS | ⬜ Not started | ffmpeg transcode pipeline |
| 4 | Tab Share mode | ⬜ Not started | getDisplayMedia, DRM messaging |
| 5 | Polish | ⬜ Not started | Framer Motion pass, edge cases |

---

## Checkpoint 1 — Room Shell
**Status**: ✅ Implemented; the manual checklist is still pending  
**Branch/commit**: _fill in after push_

### What was built
- Express + Socket.io server with in-memory room state
- Room create/join with 6-char code
- WebRTC mesh via browser `RTCPeerConnection` with Google STUN servers and Socket.IO signaling
- Camera and microphone requested independently; joining works if either track is available
- Peer tiles with live video, name/status indicators, and remote mute/hide controls
- Global `ErrorContext` + `<ErrorDialog>` (Radix Dialog + Framer Motion)
- Responsive Tiles and Focus layouts, plus Cine mode
- Sticky room header, shared Watch Party wordmark, and room-code copy control

### Known issues / deferred
- STUN is configured, but there is no TURN relay; restrictive networks may prevent peer connections
- No reconnect handling on refresh (by design, MVP)

---

## Checkpoint 2 — Direct Playback _(upcoming)_
## Checkpoint 2 — Direct Playback
**Status**: 🟡 Core implementation present; manual two-client verification pending

### What was built
- URL input and playback for direct MP4 and HLS (`.m3u8`) links
- hls.js adaptive quality selection and quality-level controls
- Controller-based play, pause, and seek synchronization over Socket.IO
- Playback URL and latest state stored per room for joiners
- Drift correction every 5 seconds when clients differ by more than 1.5 seconds

### Known issues / deferred
- Controller handoff after the controller disconnects is not implemented
- Media URLs must be browser-accessible; remote hosts must allow cross-origin media access
- Playback sync, HLS quality switching, and late-join behavior have not been verified in a two-client session

---

## Decision Log
| Date | Decision | Reason |
|---|---|---|
| CP1 | Mesh WebRTC, no SFU | ≤6 peers, no infra cost |
| CP1 | No React Router | Two views only, state-based routing is sufficient |
| CP1 | Trickle ICE off | Simplicity; acceptable latency for small rooms |
| CP1 | Render free tier for server | Free, persistent process, WebSocket support |
| CP1 | Vercel for client | Free, zero-config Vite deploys |
| CP1 | No file upload yet | Deferred to CP3; Google Drive links cover Direct Playback |
| CP1 | Tiles, Focus, and Cine layouts | Participants can choose gallery or player-first room layouts |
