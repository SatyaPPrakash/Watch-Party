# Watch Party

Synchronized movie-watching with webcam tiles. No accounts required.

## Setup

### Server
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### Client
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Client runs on `http://localhost:5173`, server on `http://localhost:4000`.

## Deployment

- **Client** → Vercel. Set `VITE_SERVER_URL` to your Render server URL.
- **Server** → Render. Set `CLIENT_URL` to your Vercel client URL, `PORT` is set automatically by Render.

## Checkpoints

- [x] 1. Room shell — create/join, webcam/mic tiles, WebRTC mesh, ErrorDialog
- [ ] 2. Direct Playback — link input, sync engine (play/pause/seek + drift correction)
- [ ] 3. Upload → HLS pipeline — ffmpeg transcode, adaptive quality via hls.js
- [ ] 4. Tab Share mode — getDisplayMedia, WebRTC broadcast, DRM messaging
- [ ] 5. Polish — Framer Motion animations, final responsive refinement
