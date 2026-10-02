import { Server, Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, SyncPayload } from "../types/room.js";

const roomSyncState = new Map<string, SyncPayload>();
const roomController = new Map<string, string>();

export function registerSyncHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on("sync:update", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;

    const controller = roomController.get(code);
    if (controller && controller !== socket.id) return;

    if (!controller) {
      roomController.set(code, socket.id);
      io.to(code).emit("sync:controller-changed", socket.id);
    }

    const stamped: SyncPayload = { ...payload, timestamp: Date.now() };
    roomSyncState.set(code, stamped);
    socket.to(code).emit("sync:state", stamped);
  });

  socket.on("sync:request-state", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const state = roomSyncState.get(code);
    const controller = roomController.get(code);

    if (state) socket.emit("sync:state", state);
    if (controller) socket.emit("sync:controller-changed", controller);
  });

  socket.on("sync:set-controller", (peerId) => {
    const code = socket.data.roomCode;
    if (!code) return;

    roomController.set(code, peerId);
    io.to(code).emit("sync:controller-changed", peerId);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    if (roomController.get(code) === socket.id) {
      roomController.delete(code);
    }
  });
}

export function clearRoomSyncState(code: string) {
  roomSyncState.delete(code);
  roomController.delete(code);
}