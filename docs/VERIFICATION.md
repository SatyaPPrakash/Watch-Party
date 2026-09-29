# Verification Checklists

How to verify each checkpoint before moving to the next.
Check every item. If anything fails, note the error and share it before proceeding.

---

## Checkpoint 1 — Room Shell

### Setup
- [ ] `cd server && npm install` — no errors
- [ ] `cd client && npm install` — no errors
- [ ] Copy `.env.example` → `.env` in both folders
- [ ] `npm run dev` in server → prints `Server running on port 4000`
- [ ] `npm run dev` in client → opens `http://localhost:5173` with no console errors

### Home screen
- [ ] Logo + "watch party" text visible
- [ ] "New room" and "Join room" tabs switch correctly
- [ ] Name input and Create button visible on "New room" tab
- [ ] Code input appears only on "Join room" tab

### Create room
- [ ] Enter a name, click "Create room"
- [ ] Browser asks for camera + mic permission — allow it
- [ ] Page transitions to Room view
- [ ] 6-char room code visible top-right (e.g. `K7MNP2`)
- [ ] Your webcam tile appears with your name
- [ ] Click room code — copies to clipboard (check with paste)

### Join from second tab
- [ ] Open `localhost:5173` in a second tab (or incognito)
- [ ] Enter a different name, paste the room code, click "Join"
- [ ] Both tabs now show two tiles
- [ ] Both tiles show live webcam feeds

### Toggle controls
- [ ] Click "Mute" in tab 1 — mic icon appears on your tile in tab 2
- [ ] Click "Unmute" — mic icon disappears in tab 2
- [ ] Click "Hide camera" — your tile shows avatar initial in both tabs
- [ ] Click "Show camera" — live feed resumes

### Peer disconnect
- [ ] Close tab 2 — tile disappears from tab 1 within ~2 seconds

### Error dialog
- [ ] Go to "Join room", enter any name, type `XXXXXX` as code, click Join
- [ ] Error dialog appears: "Couldn't join" with message
- [ ] Clicking X or "Got it" closes it
- [ ] Try clicking "Create room" with empty name — error dialog appears

### Layout (responsive)
- [ ] On desktop (>1024px): tiles appear in right sidebar
- [ ] Resize to mobile width (<768px): tiles stack below the video area

---

## Checkpoint 2 — Direct Playback _(fill in when built)_

### Player
- [ ] URL input accepts `.mp4` and `.m3u8` links
- [ ] Video loads and plays
- [ ] Quality level indicator visible
- [ ] hls.js auto-switches quality on bandwidth change

### Sync engine
- [ ] Play in tab 1 → plays in tab 2
- [ ] Pause in tab 1 → pauses in tab 2
- [ ] Seek in tab 1 → seeks in tab 2
- [ ] Open tab 2 mid-playback → snaps to controller's timestamp
- [ ] Drift correction: manually lag one tab, wait 5s → auto-corrects

---

## Checkpoint 3 — Upload → HLS _(fill in when built)_

### Upload
- [ ] File picker accepts video files
- [ ] Progress indicator shown during transcode (not frozen screen)
- [ ] Playback starts before full transcode completes (live transcode)
- [ ] Multiple quality levels available (1080p/720p/480p/360p)

---

## Checkpoint 4 — Tab Share _(fill in when built)_

### Screen share
- [ ] "Share tab" button triggers `getDisplayMedia` picker
- [ ] Selected tab streams to all room members
- [ ] DRM black screen dialog appears when needed (test with Netflix)
- [ ] Audio still comes through on DRM-blocked video

---

## Checkpoint 5 — Polish _(fill in when built)_

### Animations
- [ ] Room entry transition smooth
- [ ] Tile join/leave animated
- [ ] Dialog entrance/exit animated
- [ ] No janky layout shifts

### Edge cases
- [ ] 6-peer room rejects a 7th (error dialog)
- [ ] Network drop mid-session surfaces error
- [ ] All error states use ErrorDialog (no console-only errors)
