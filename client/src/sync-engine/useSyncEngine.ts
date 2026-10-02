import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents, SyncPayload } from "../types/room";

const DRIFT_THRESHOLD = 1.5;
const DRIFT_CHECK_MS = 5000;

interface UseSyncEngineOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isController: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useSyncEngine({ socket, isController, videoRef }: UseSyncEngineOptions) {
  const lastStateRef = useRef<SyncPayload | null>(null);
  const driftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const broadcast = useCallback(() => {
    const video = videoRef.current;
    if (!video || !socket || !isController) return;

    const payload: SyncPayload = {
      state: video.paused ? "paused" : "playing",
      currentTime: video.currentTime,
      timestamp: Date.now(),
    };
    socket.emit("sync:update", payload);
  }, [socket, isController, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isController) return;

    video.addEventListener("play", broadcast);
    video.addEventListener("pause", broadcast);
    video.addEventListener("seeked", broadcast);

    return () => {
      video.removeEventListener("play", broadcast);
      video.removeEventListener("pause", broadcast);
      video.removeEventListener("seeked", broadcast);
    };
  }, [isController, broadcast, videoRef]);

  const applyState = useCallback((payload: SyncPayload, force = false) => {
    const video = videoRef.current;
    if (!video) return;

    const latency = (Date.now() - payload.timestamp) / 1000;
    const targetTime = payload.currentTime + (payload.state === "playing" ? latency : 0);
    const drift = Math.abs(video.currentTime - targetTime);

    if (force || drift > DRIFT_THRESHOLD) {
      video.currentTime = targetTime;
    }

    if (payload.state === "playing" && video.paused) {
      video.play().catch(() => {});
    } else if (payload.state === "paused" && !video.paused) {
      video.pause();
    }
  }, [videoRef]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: SyncPayload) => {
      lastStateRef.current = payload;
      if (!isController) applyState(payload);
    };

    socket.on("sync:state", handler);
    return () => { socket.off("sync:state", handler); };
  }, [socket, isController, applyState]);

  useEffect(() => {
    if (isController) {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
      return;
    }

    driftIntervalRef.current = setInterval(() => {
      const last = lastStateRef.current;
      const video = videoRef.current;
      if (!last || !video || video.paused) return;

      const elapsed = (Date.now() - last.timestamp) / 1000;
      const projected: SyncPayload = {
        ...last,
        currentTime: last.state === "playing" ? last.currentTime + elapsed : last.currentTime,
        timestamp: Date.now(),
      };

      const drift = Math.abs(video.currentTime - projected.currentTime);
      if (drift > DRIFT_THRESHOLD) applyState(projected, true);
    }, DRIFT_CHECK_MS);

    return () => {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
    };
  }, [isController, applyState, videoRef]);

  return { broadcast };
}