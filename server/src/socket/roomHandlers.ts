import { Server, Socket } from "socket.io";
import { Room, Peer, ServerToClientEvents, ClientToServerEvents, RoomSnapshot } from "../types/room.js";

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function toSnapshot(room: Room): RoomSnapshot {
  return { code: room.code, peers: Array.from(room.peers.values()) };
}

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on("room:create", (displayName, cb) => {
    let code = generateCode();
    while (rooms.has(code)) code = generateCode();

    const peer: Peer = { id: socket.id, displayName, cameraOn: true, micOn: true };
    const room: Room = { code, peers: new Map([[socket.id, peer]]), createdAt: Date.now() };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;

    cb(code);
    socket.emit("room:joined", { room: toSnapshot(room), peer });
  });

  socket.on("room:join", ({ code, displayName }, cb) => {
    const room = rooms.get(code.toUpperCase());
    if (!room) return cb("Room not found. Check the code and try again.");
    if (room.peers.size >= 6) return cb("Room is full (max 6 people).");

    const peer: Peer = { id: socket.id, displayName, cameraOn: true, micOn: true };
    room.peers.set(socket.id, peer);
    socket.join(code);
    socket.data.roomCode = code;

    cb(null);
    socket.emit("room:joined", { room: toSnapshot(room), peer });
    socket.to(code).emit("room:peer-joined", peer);
  });

  socket.on("room:toggle-camera", (cameraOn) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const peer = room?.peers.get(socket.id);
    if (!peer || !room) return;

    peer.cameraOn = cameraOn;
    io.to(code).emit("room:peer-updated", peer);
  });

  socket.on("room:toggle-mic", (micOn) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const peer = room?.peers.get(socket.id);
    if (!peer || !room) return;

    peer.micOn = micOn;
    io.to(code).emit("room:peer-updated", peer);
  });

  // WebRTC signaling passthrough
  socket.on("signal", ({ to, signal }) => {
    io.to(to).emit("signal", { from: socket.id, signal });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    room.peers.delete(socket.id);
    socket.to(code).emit("room:peer-left", socket.id);

    if (room.peers.size === 0) rooms.delete(code);
  });
}
