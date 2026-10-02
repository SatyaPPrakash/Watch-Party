import { useState, useCallback, useEffect } from "react";
import { Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "../types/room";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export type UploadStatus = "idle" | "uploading" | "transcoding" | "ready" | "error";

interface UseUploadOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  roomCode: string | null;
  onReady: (hlsUrl: string) => void;
}

export function useUpload({ socket, roomCode, onReady }: UseUploadOptions) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onProgress = ({ jobId, percent, status: s }: { jobId: string; percent: number; status: string }) => {
      if (jobId !== currentJobId) return;
      setProgress(percent);
      if (s === "transcoding") setStatus("transcoding");
    };

    const onReadyEvt = ({ jobId, hlsUrl }: { jobId: string; hlsUrl: string }) => {
      if (jobId !== currentJobId) return;
      setStatus("ready");
      setProgress(100);
      onReady(`${SERVER_URL}${hlsUrl}`);
    };

    const onError = ({ jobId, message }: { jobId: string; message: string }) => {
      if (jobId !== currentJobId) return;
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

    const formData = new FormData();
    formData.append("video", file);
    formData.append("roomCode", roomCode);
    formData.append("socketId", socket.id);

    try {
      const res = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }

      const { jobId } = await res.json();
      setCurrentJobId(jobId);
      setStatus("transcoding");
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }, [roomCode, socket]);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setErrorMsg(null);
    setCurrentJobId(null);
  }, []);

  return { status, progress, errorMsg, uploadFile, reset };
}