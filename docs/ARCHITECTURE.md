# Architecture

## Folder Structure
```
watch-party/
├── client/                  Vite + React + TypeScript (→ Vercel)
│   └── src/
│       ├── types/           Shared TS interfaces (room, events)
│       ├── context/         React contexts (Error, Room)
│       ├── components/      UI components
│       └── pages/           Full-page views (Home, Room)
│
├── server/                  Node + Express + Socket.io (→ Render)
│   └── src/
│       ├── types/           Shared TS interfaces
│       └── socket/          Socket.io event handlers
│
└── docs/                    Project documentation
```

## Key Decisions

### State management
- No Redux/Zustand — React context is sufficient for this scope
- `ErrorContext` — global error surface, single `<ErrorDialog>` driven by it
- `RoomContext` — socket ref, peer list, local stream, WebRTC connections, toggle state

### WebRTC topology
- **Mesh** (peer-to-peer between every client pair) — fine for ≤6 peers
- `simple-peer` wraps RTCPeerConnection — handles offer/answer/ICE internally
- Server is signaling-only — never touches media streams
- Trickle ICE disabled (`trickle: false`) for simplicity at MVP scale

### Socket.io event contract
All events typed via `ServerToClientEvents` / `ClientToServerEvents` interfaces (mirrored in both `client/src/types/room.ts` and `server/src/types/room.ts`).

| Event | Direction | Purpose |
|---|---|---|
| `room:create` | C→S | Create room, returns code |
| `room:join` | C→S | Join existing room |
| `room:joined` | S→C | Room snapshot on successful join/create |
| `room:peer-joined` | S→C | Broadcast when new peer joins |
| `room:peer-left` | S→C | Broadcast when peer disconnects |
| `room:peer-updated` | S→C | Camera/mic toggle broadcast |
| `room:toggle-camera` | C→S | Local camera state change |
| `room:toggle-mic` | C→S | Local mic state change |
| `signal` | C→S→C | WebRTC signaling passthrough |

### Room state (server)
- In-memory `Map<code, Room>` — lost on restart (acceptable MVP)
- Room deleted when last peer leaves
- Max 6 peers per room (hard cap)
- 6-char alphanumeric code, ambiguous chars removed (no 0/O, 1/I)

### Sync engine (Checkpoint 2+)
- One "controller" peer — their play/pause/seek events broadcast to all
- Drift check every ~5s — clients more than 1.5s off snap to controller timestamp
- Built as `src/sync-engine/` module, separate from WebRTC logic

### Upload/HLS (Checkpoint 3+)
- `fluent-ffmpeg` transcodes upload → HLS ladder (1080p/720p/480p/360p)
- Segments served as static files from `/hls-output`
- Live transcoding: playback starts after first segments ready, not after full transcode
- No cloud storage — local disk only

## Environment Variables

### Client
| Variable | Default | Purpose |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:4000` | Socket.io server URL |

### Server
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |
