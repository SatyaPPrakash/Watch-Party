import { Server, Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, SyncPayload } from "../types/room.js";

// Last known playback state per room — used to sync late joiners
const roomSyncState = new Map<string, SyncPayload>();
const roomController = new Map<string, string>(); // roomCode → socket.id
const roomUrl = new Map<string, string>();         // roomCode → video URL

export function registerSyncHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  // Controller broadcasts a state update (play/pause/seek)
  socket.on("sync:update", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;

    // Only the controller can broadcast sync updates
    const controller = roomController.get(code);
    if (controller && controller !== socket.id) return;

    // If no controller set yet, first sender becomes controller
    if (!controller) {
      roomController.set(code, socket.id);
      io.to(code).emit("sync:controller-changed", socket.id);
    }

    const stamped: SyncPayload = { ...payload, timestamp: Date.now() };
    roomSyncState.set(code, stamped);

    // Broadcast to everyone else in the room
    socket.to(code).emit("sync:state", stamped);
  });

  // Controller broadcasts a URL load to all peers
  socket.on("sync:load-url", (url: string) => {
    const code = socket.data.roomCode;
    if (!code) return;

    const controller = roomController.get(code);
    if (controller && controller !== socket.id) return;

    roomUrl.set(code, url);
    socket.to(code).emit("sync:load-url", url);
  });

  // New joiner requests current state to snap to
  socket.on("sync:request-state", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const state = roomSyncState.get(code);
    const controller = roomController.get(code);
    const url = roomUrl.get(code);

    if (url) socket.emit("sync:load-url", url);
    if (state) socket.emit("sync:state", state);
    if (controller) socket.emit("sync:controller-changed", controller);
  });

  // Manually hand controller role to a specific peer
  socket.on("sync:set-controller", (peerId) => {
    const code = socket.data.roomCode;
    if (!code) return;

    roomController.set(code, peerId);
    io.to(code).emit("sync:controller-changed", peerId);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    // If controller left, clear controller so next sync:update claims it
    if (roomController.get(code) === socket.id) {
      roomController.delete(code);
    }

    // Clean up sync state if room is now empty (roomHandlers deletes the room,
    // but we own the sync maps here)
    // We rely on room deletion in roomHandlers — just clean sync maps
    // Small races are acceptable for MVP
  });
}

export function clearRoomSyncState(code: string) {
  roomSyncState.delete(code);
  roomController.delete(code);
  roomUrl.delete(code);
}