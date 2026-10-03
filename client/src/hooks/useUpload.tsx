import { useState, useCallback, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "../types/room";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export type UploadStatus = "idle" | "uploading" | "transcoding" | "ready" | "error" | "cancelled";

interface UseUploadOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  roomCode: string | null;
  onReady: (hlsUrl: string) => void;
}

function requestUploadCancellation(jobId: string, roomCode: string, socketId: string) {
  void fetch(`${SERVER_URL}/upload/${jobId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode, socketId }),
  }).catch(() => {});
}

export function useUpload({ socket, roomCode, onReady }: UseUploadOptions) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const uploadOwnerRef = useRef<{ roomCode: string; socketId: string } | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onProgress = ({ jobId, percent, status: s }: { jobId: string; percent: number; status: string }) => {
      if (jobId !== currentJobId) return;
      setProgress(percent);
      if (s === "transcoding") setStatus("transcoding");
      if (s === "done") {
        activeJobIdRef.current = null;
        uploadOwnerRef.current = null;
        setStatus("ready");
      }
      if (s === "cancelled") setStatus("cancelled");
    };

    const onReadyEvt = ({ jobId, hlsUrl }: { jobId: string; hlsUrl: string }) => {
      if (jobId !== currentJobId) return;
      activeJobIdRef.current = null;
      uploadOwnerRef.current = null;
      setStatus("ready");
      setProgress(100);
      onReady(`${SERVER_URL}${hlsUrl}`);
    };

    const onError = ({ jobId, message }: { jobId: string; message: string }) => {
      if (jobId !== currentJobId) return;
      activeJobIdRef.current = null;
      uploadOwnerRef.current = null;
      setStatus("error");
      setErrorMsg(message);
    };

    socket.on("upload:progress", onProgress);
    socket.on("upload:ready", onReadyEvt);
    socket.on("upload:error", onError);

    return () => {
      socket.off("upload:progress", onProgress);
      socket.off("upload:ready", onReadyEvt);
      socket.off("upload:error", onError);
    };
  }, [socket, currentJobId, onReady]);

  const uploadFile = useCallback(async (file: File) => {
    if (!roomCode || !socket?.connected || !socket.id) {
      setStatus("error");
      setErrorMsg("Connect to a room before uploading.");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setErrorMsg(null);

    const jobId = crypto.randomUUID();
    const abortController = new AbortController();
    activeJobIdRef.current = jobId;
    uploadOwnerRef.current = { roomCode, socketId: socket.id };
    uploadAbortRef.current = abortController;
    setCurrentJobId(jobId);

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
        signal: abortController.signal,
        headers: {
          "x-upload-id": jobId,
          "x-room-code": roomCode,
          "x-socket-id": socket.id,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }

      await res.json();
      uploadAbortRef.current = null;
      setStatus("transcoding");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      activeJobIdRef.current = null;
      uploadOwnerRef.current = null;
      setCurrentJobId(null);
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }, [roomCode, socket]);

  const cancelUpload = useCallback(() => {
    const jobId = activeJobIdRef.current;
    const owner = uploadOwnerRef.current;
    activeJobIdRef.current = null;
    uploadOwnerRef.current = null;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setCurrentJobId(null);
    setStatus("cancelled");
    setProgress(0);

    if (jobId && owner) requestUploadCancellation(jobId, owner.roomCode, owner.socketId);
  }, []);

  useEffect(() => () => {
    const jobId = activeJobIdRef.current;
    const owner = uploadOwnerRef.current;
    if (!jobId || !owner) return;
    uploadAbortRef.current?.abort();
    requestUploadCancellation(jobId, owner.roomCode, owner.socketId);
  }, []);

  const reset = useCallback(() => {
    activeJobIdRef.current = null;
    uploadOwnerRef.current = null;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setStatus("idle");
    setProgress(0);
    setErrorMsg(null);
    setCurrentJobId(null);
  }, []);

  return { status, progress, errorMsg, uploadFile, cancelUpload, reset };
}