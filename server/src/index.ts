import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerRoomHandlers } from "./socket/roomHandlers.js";
import { registerSyncHandlers } from "./socket/syncHandlers.js";
import { createUploadRouter } from "./routes/upload.js";
import { ServerToClientEvents, ClientToServerEvents } from "./types/room.js";

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(createUploadRouter(io));

io.on("connection", (socket) => {
  registerRoomHandlers(io, socket);
  registerSyncHandlers(io, socket);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));