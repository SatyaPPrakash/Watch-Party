# Progress

## Checkpoint Status

| # | Name | Status | Notes |
|---|---|---|---|
| 1 | Room shell | ✅ Built — pending your verification | WebRTC mesh, tiles, ErrorDialog, layout |
| 2 | Direct Playback | ⬜ Not started | hls.js player, sync engine |
| 3 | Upload → HLS | ⬜ Not started | ffmpeg transcode pipeline |
| 4 | Tab Share mode | ⬜ Not started | getDisplayMedia, DRM messaging |
| 5 | Polish | ⬜ Not started | Framer Motion pass, edge cases |

---

## Checkpoint 1 — Room Shell
**Status**: ✅ Built  
**Branch/commit**: _fill in after push_

### What was built
- Express + Socket.io server with in-memory room state
- Room create/join with 6-char code
- WebRTC mesh via `simple-peer` (signaling through Socket.io)
- Local webcam/mic stream with per-track enable/disable toggles
- Peer tiles with live video, name bar, mic/camera status indicators
- Global `ErrorContext` + `<ErrorDialog>` (Radix Dialog + Framer Motion)
- Responsive layout: sidebar on desktop, stacked on mobile
- `VideoShell` placeholder for checkpoint 2

### Known issues / deferred
- No STUN/TURN config — WebRTC works on LAN/localhost; may fail across different networks (fix in CP2 or CP5)
- No reconnect handling on refresh (by design, MVP)

---

## Checkpoint 2 — Direct Playback _(upcoming)_
**Planned scope**:
- URL input (`.mp4`, `.m3u8` direct links)
- `hls.js` player integrated into `VideoShell`
- Sync engine: controller designation, play/pause/seek broadcast via Socket.io
- Drift correction: every 5s, snap clients >1.5s off
- Quality indicator (current HLS level) shown on player

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
