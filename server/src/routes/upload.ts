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
const JOB_ID_PATTERN = /^[a-f0-9-]{36}$/i;

interface UploadOperation {
  jobId: string;
  roomCode: string;
  socketId: string;
  cancelled: boolean;
  inputPath?: string;
  outputDir?: string;
  cancelTranscode?: () => Promise<void>;
}

interface CancellationTombstone {
  roomCode: string;
  socketId: string;
  timer: ReturnType<typeof setTimeout>;
}

const uploadOperations = new Map<string, UploadOperation>();
const cancellationTombstones = new Map<string, CancellationTombstone>();

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

async function removeOperationFiles(operation: UploadOperation) {
  if (operation.inputPath) {
    await fs.promises.unlink(operation.inputPath).catch(() => {});
  }
  if (operation.outputDir) {
    await fs.promises.rm(operation.outputDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function createUploadRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = express.Router();

  router.post("/upload", (req, res, next) => {
    const jobId = req.get("x-upload-id") ?? "";
    const roomCode = req.get("x-room-code") ?? "";
    const socketId = req.get("x-socket-id") ?? "";
    const clientSocket = io.sockets.sockets.get(socketId);

    if (!JOB_ID_PATTERN.test(jobId)) {
      res.status(400).json({ error: "Invalid upload ID." });
      return;
    }
    if (!roomCode || !clientSocket || clientSocket.data.roomCode !== roomCode) {
      res.status(403).json({ error: "Join the room before uploading." });
      return;
    }

    const tombstone = cancellationTombstones.get(jobId);
    if (tombstone) {
      clearTimeout(tombstone.timer);
      cancellationTombstones.delete(jobId);
      if (tombstone.roomCode === roomCode && tombstone.socketId === socketId) {
        res.status(410).json({ error: "Upload cancelled." });
      } else {
        res.status(403).json({ error: "Upload is not available." });
      }
      return;
    }
    if (uploadOperations.has(jobId)) {
      res.status(409).json({ error: "Upload ID is already in use." });
      return;
    }

    const operation: UploadOperation = { jobId, roomCode, socketId, cancelled: false };
    uploadOperations.set(jobId, operation);
    req.on("aborted", () => {
      operation.cancelled = true;
      uploadOperations.delete(jobId);
      void operation.cancelTranscode?.().then(() => removeOperationFiles(operation));
    });
    next();
  }, (req, res, next) => {
    upload.single("video")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      const jobId = req.get("x-upload-id") ?? "";
      const operation = uploadOperations.get(jobId);
      if (operation) {
        operation.cancelled = true;
        uploadOperations.delete(jobId);
        void operation.cancelTranscode?.().then(() => removeOperationFiles(operation));
      }
      next(error);
    });
  }, (req, res) => {
    const jobId = req.get("x-upload-id") ?? "";
    const operation = uploadOperations.get(jobId);
    if (!req.file) {
      if (operation) uploadOperations.delete(jobId);
      res.status(400).json({ error: "No valid video file uploaded." });
      return;
    }

    if (!operation || operation.cancelled) {
      fs.unlink(req.file.path, () => {});
      res.status(410).json({ error: "Upload cancelled." });
      return;
    }

    const outputDir = path.join(HLS_DIR, jobId);
    const inputPath = req.file.path;
    operation.inputPath = inputPath;
    operation.outputDir = outputDir;

    // Respond immediately — transcode happens async
    res.json({ jobId });

    // Notify room that transcode started
    io.to(operation.roomCode).emit("upload:progress", { jobId, percent: 0, status: "transcoding" });

    operation.cancelTranscode = transcodeToHls({
      inputPath,
      outputDir,
      jobId,
      onProgress: (percent) => {
        if (!operation.cancelled) {
          io.to(operation.roomCode).emit("upload:progress", { jobId, percent, status: "transcoding" });
        }
      },
      onReady: () => {
        if (operation.cancelled) return;
        // First segments ready — tell clients to start loading
        const hlsUrl = `/hls/${jobId}/master.m3u8`;
        io.to(operation.roomCode).emit("upload:ready", { jobId, hlsUrl });
      },
      onDone: () => {
        if (operation.cancelled) return;
        uploadOperations.delete(jobId);
        io.to(operation.roomCode).emit("upload:progress", { jobId, percent: 100, status: "done" });
        // Clean up source file after transcode
        fs.unlink(inputPath, () => {});
      },
      onError: (err) => {
        if (operation.cancelled) return;
        uploadOperations.delete(jobId);
        io.to(operation.roomCode).emit("upload:error", { jobId, message: err.message });
        void removeOperationFiles(operation);
      },
    });
  });

  router.delete("/upload/:jobId", async (req, res) => {
    const { jobId } = req.params;
    const { roomCode, socketId } = req.body as { roomCode?: string; socketId?: string };
    const clientSocket = socketId ? io.sockets.sockets.get(socketId) : undefined;
    if (!JOB_ID_PATTERN.test(jobId) || !roomCode || !socketId) {
      res.status(403).json({ error: "Join the room before cancelling an upload." });
      return;
    }

    const operation = uploadOperations.get(jobId);
    if (operation && (operation.roomCode !== roomCode || operation.socketId !== socketId)) {
      res.status(404).json({ error: "Upload not found." });
      return;
    }
    if (!operation) {
      if (!clientSocket || clientSocket.data.roomCode !== roomCode) {
        res.status(403).json({ error: "Join the room before cancelling an upload." });
        return;
      }
      const timer = setTimeout(() => cancellationTombstones.delete(jobId), 60_000);
      cancellationTombstones.set(jobId, { roomCode, socketId, timer });
      res.status(202).json({ cancelled: true });
      return;
    }
    if (clientSocket && clientSocket.data.roomCode !== roomCode) {
      res.status(403).json({ error: "Join the room before cancelling an upload." });
      return;
    }

    operation.cancelled = true;
    uploadOperations.delete(jobId);
    await operation.cancelTranscode?.();
    await removeOperationFiles(operation);
    io.to(roomCode).emit("upload:progress", { jobId, percent: 0, status: "cancelled" });
    res.status(200).json({ cancelled: true });
  });

  router.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message });
      return;
    }
    next(error);
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