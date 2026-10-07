import { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { Room, Peer, ServerToClientEvents, ClientToServerEvents, RoomSnapshot, JoinRequest } from "../types/room.js";
import { clearRoomSyncState } from "./syncHandlers.js";

const rooms = new Map<string, Room>();

interface PendingJoinRequest extends JoinRequest {
  roomCode: string;
  socketId: string;
  acknowledge: (error: string | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingJoinRequests = new Map<string, PendingJoinRequest>();
const pendingRequestBySocket = new Map<string, string>();

function clearPendingRequest(requestId: string) {
  const request = pendingJoinRequests.get(requestId);
  if (!request) return null;
  clearTimeout(request.timer);
  pendingJoinRequests.delete(requestId);
  pendingRequestBySocket.delete(request.socketId);
  return request;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function toSnapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    peers: Array.from(room.peers.values()),
    hostId: room.hostId,
    screenSharerId: room.screenSharerId,
  };
}

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on("room:create", (displayName, cb) => {
    let code = generateCode();
    while (rooms.has(code)) code = generateCode();

    const peer: Peer = { id: socket.id, displayName, cameraOn: true, micOn: true };
    const room: Room = {
      code,
      peers: new Map([[socket.id, peer]]),
      hostId: socket.id,
      screenSharerId: null,
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;

    cb(code);
    socket.emit("room:joined", { room: toSnapshot(room), peer });
  });

  socket.on("room:join", ({ code, displayName }, cb) => {
    const normalizedCode = code.trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return cb("Room not found. Check the code and try again.");
    if (socket.data.roomCode || pendingRequestBySocket.has(socket.id)) {
      return cb("You already have an active room or join request.");
    }

    const pendingInRoom = Array.from(pendingJoinRequests.values()).filter((request) => request.roomCode === normalizedCode).length;
    if (room.peers.size + pendingInRoom >= 6) return cb("Room is full (max 6 people).");

    const requestId = randomUUID();
    const request: PendingJoinRequest = {
      requestId,
      displayName: displayName.trim().slice(0, 24),
      roomCode: normalizedCode,
      socketId: socket.id,
      acknowledge: cb,
      timer: setTimeout(() => {
        const expired = clearPendingRequest(requestId);
        if (expired) expired.acknowledge("The host did not respond to your request.");
      }, 60_000),
    };
    pendingJoinRequests.set(requestId, request);
    pendingRequestBySocket.set(socket.id, requestId);
    socket.emit("room:join-pending", requestId);
    io.to(room.hostId).emit("room:join-request", { requestId, displayName: request.displayName });
  });

  socket.on("room:approve-join", (requestId) => {
    const request = pendingJoinRequests.get(requestId);
    if (!request) return;
    const room = rooms.get(request.roomCode);
    if (!room || room.hostId !== socket.id) return;

    const joiningSocket = io.sockets.sockets.get(request.socketId);
    if (!joiningSocket) {
      clearPendingRequest(requestId)?.acknowledge("Your connection was lost.");
      io.to(room.hostId).emit("room:join-request-cancelled", requestId);
      return;
    }
    if (room.peers.size >= 6) {
      clearPendingRequest(requestId)?.acknowledge("Room is full (max 6 people).");
      return;
    }

    clearPendingRequest(requestId);
    const peer: Peer = { id: joiningSocket.id, displayName: request.displayName, cameraOn: true, micOn: true };
    room.peers.set(joiningSocket.id, peer);
    joiningSocket.join(room.code);
    joiningSocket.data.roomCode = room.code;
    joiningSocket.emit("room:joined", { room: toSnapshot(room), peer });
    request.acknowledge(null);
    io.to(room.code).except(joiningSocket.id).emit("room:peer-joined", peer);
  });

  socket.on("room:deny-join", (requestId) => {
    const request = pendingJoinRequests.get(requestId);
    if (!request) return;
    const room = rooms.get(request.roomCode);
    if (!room || room.hostId !== socket.id) return;
    clearPendingRequest(requestId)?.acknowledge("The host declined your request.");
  });

  socket.on("room:cancel-join", (requestId) => {
    const request = pendingJoinRequests.get(requestId);
    if (!request || request.socketId !== socket.id) return;
    const room = rooms.get(request.roomCode);
    clearPendingRequest(requestId)?.acknowledge("Join request cancelled.");
    if (room) io.to(room.hostId).emit("room:join-request-cancelled", requestId);
  });

  socket.on("room:dismiss", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) {
      socket.emit("room:error", "Only the host can dismiss this room.");
      return;
    }

    for (const request of pendingJoinRequests.values()) {
      if (request.roomCode !== code) continue;
      clearPendingRequest(request.requestId)?.acknowledge("The host closed the room.");
    }

    io.to(code).emit("room:closed");
    for (const peerId of room.peers.keys()) {
      const peerSocket = io.sockets.sockets.get(peerId);
      peerSocket?.leave(code);
      if (peerSocket) peerSocket.data.roomCode = undefined;
    }
    rooms.delete(code);
    clearRoomSyncState(code);
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

  socket.on("room:screen-share", (isSharing) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    if (isSharing) {
      if (room.screenSharerId && room.screenSharerId !== socket.id) {
        socket.emit("room:error", "Another participant is already sharing their screen.");
        socket.emit("room:screen-share-changed", room.screenSharerId);
        return;
      }
      room.screenSharerId = socket.id;
    } else if (room.screenSharerId === socket.id) {
      room.screenSharerId = null;
    }
    io.to(code).emit("room:screen-share-changed", room.screenSharerId);
  });

  // WebRTC signaling passthrough
  socket.on("room:remote-mute", (targetId) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const target = room?.peers.get(targetId);
    if (!target || !room) return;

    target.micOn = false;
    io.to(code).emit("room:peer-updated", target);
    io.to(targetId).emit("room:you-were-muted");
  });

  socket.on("room:remote-hide-camera", (targetId) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const target = room?.peers.get(targetId);
    if (!target || !room) return;

    target.cameraOn = false;
    io.to(code).emit("room:peer-updated", target);
    io.to(targetId).emit("room:your-camera-was-hidden");
  });

  socket.on("signal", ({ to, signal }) => {
    io.to(to).emit("signal", { from: socket.id, signal });
  });

  socket.on("disconnect", () => {
    const pendingRequestId = pendingRequestBySocket.get(socket.id);
    if (pendingRequestId) {
      const request = clearPendingRequest(pendingRequestId);
      if (request) {
        request.acknowledge("Your connection was lost.");
        const pendingRoom = rooms.get(request.roomCode);
        if (pendingRoom) io.to(pendingRoom.hostId).emit("room:join-request-cancelled", pendingRequestId);
      }
    }

    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    room.peers.delete(socket.id);
    if (room.hostId === socket.id && room.peers.size > 0) {
      room.hostId = room.peers.keys().next().value as string;
      io.to(code).emit("room:host-changed", room.hostId);
      for (const request of pendingJoinRequests.values()) {
        if (request.roomCode === code) {
          io.to(room.hostId).emit("room:join-request", {
            requestId: request.requestId,
            displayName: request.displayName,
          });
        }
      }
    }
    if (room.screenSharerId === socket.id) {
      room.screenSharerId = null;
      socket.to(code).emit("room:screen-share-changed", null);
    }
    socket.to(code).emit("room:peer-left", socket.id);

    if (room.peers.size === 0) {
      rooms.delete(code);
      clearRoomSyncState(code);
    }
  });
}