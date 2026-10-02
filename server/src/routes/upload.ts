import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { transcodeToHls } from "../transcode/hlsTranscoder.js";
import { ServerToClientEvents, ClientToServerEvents } from "../types/room.js";

const UPLOADS_DIR = path.resolve("uploads");
const HLS_DIR = path.resolve("hls-output");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(HLS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB
  fileFilter: (_req, file, cb) => {
    const allowed = [".mp4", ".mkv", ".mov", ".avi", ".webm"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

export function createUploadRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = express.Router();

  router.post("/upload", upload.single("video"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No valid video file uploaded." });
      return;
    }

    const roomCode = req.body.roomCode as string | undefined;
    const socketId = req.body.socketId as string | undefined;
    const clientSocket = socketId ? io.sockets.sockets.get(socketId) : undefined;
    if (!roomCode || !clientSocket || clientSocket.data.roomCode !== roomCode) {
      fs.unlink(req.file.path, () => {});
      res.status(403).json({ error: "Join the room before uploading." });
      return;
    }

    const jobId = randomUUID();
    const outputDir = path.join(HLS_DIR, jobId);
    const inputPath = req.file.path;

    // Respond immediately — transcode happens async
    res.json({ jobId });

    // Notify room that transcode started
    io.to(roomCode).emit("upload:progress", { jobId, percent: 0, status: "transcoding" });

    transcodeToHls({
      inputPath,
      outputDir,
      jobId,
      onProgress: (percent) => {
        io.to(roomCode).emit("upload:progress", { jobId, percent, status: "transcoding" });
      },
      onReady: () => {
        // First segments ready — tell clients to start loading
        const hlsUrl = `/hls/${jobId}/master.m3u8`;
        io.to(roomCode).emit("upload:ready", { jobId, hlsUrl });
      },
      onDone: () => {
        io.to(roomCode).emit("upload:progress", { jobId, percent: 100, status: "done" });
        // Clean up source file after transcode
        fs.unlink(inputPath, () => {});
      },
      onError: (err) => {
        io.to(roomCode).emit("upload:error", { jobId, message: err.message });
        fs.unlink(inputPath, () => {});
      },
    });
  });

  // Serve HLS segments
  router.use("/hls", express.static(HLS_DIR, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");
    },
  }));

  return router;
}