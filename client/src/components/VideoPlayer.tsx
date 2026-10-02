import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Link, Loader2 } from "lucide-react";
import { useRoom } from "../context/RoomContext";
import { useError } from "../context/ErrorContext";
import { useSyncEngine } from "../sync-engine/useSyncEngine";
import { PlayerControls } from "./PlayerControls";
import { UploadPanel } from "./UploadPanel";

interface QualityLevel {
  height: number;
  index: number;
}

export function VideoPlayer() {
  const { socket, isController, controllerId, localPeer } = useRoom();
  const { showError } = useError();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [url, setUrl] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");

  const { broadcast } = useSyncEngine({ socket, isController, videoRef });

  const loadUrl = useCallback((src: string) => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setLoading(true);
    setQualityLevels([]);
    setCurrentLevel(-1);

    const isHls = src.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, startLevel: -1 });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setQualityLevels(data.levels.map((l, i) => ({ height: l.height, index: i })));
        setLoading(false);
        if (isController) video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          showError("Playback error", `Could not load the video: ${data.details}`);
          setLoading(false);
        }
      });
    } else {
      video.src = src;
      video.onloadedmetadata = () => setLoading(false);
      video.onerror = () => {
        showError("Playback error", "Could not load the video. Check the URL and try again.");
        setLoading(false);
      };
      if (isController) video.play().catch(() => {});
    }
  }, [isController, showError]);

  const handleLoad = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    loadUrl(trimmed);
    socket?.emit("sync:load-url", trimmed);
  }, [inputValue, loadUrl, socket]);

  const handleUploadReady = useCallback((hlsUrl: string) => {
    setUrl(hlsUrl);
    loadUrl(hlsUrl);
    socket?.emit("sync:load-url", hlsUrl);
  }, [loadUrl, socket]);

  // Non-controllers receive URL from controller
  useEffect(() => {
    if (isController) return;
    const socket_ = socket;
    if (!socket_) return;
    const handler = (remoteUrl: string) => {
      setUrl(remoteUrl);
      loadUrl(remoteUrl);
    };
    socket_.on("sync:load-url", handler);
    return () => { socket_.off("sync:load-url", handler); };
  }, [isController, socket, loadUrl]);

  const handleQualityChange = useCallback((index: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = index;
    setCurrentLevel(index);
    broadcast();
  }, [broadcast]);

  useEffect(() => {
    return () => { hlsRef.current?.destroy(); };
  }, []);

  const noVideo = !url;
  const controllerName = controllerId
    ? controllerId === localPeer?.id ? "you" : "the room host"
    : null;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controller input area */}
      {isController && (
        <div className="flex flex-col gap-2">
          {/* Mode tabs */}
          <div className="flex bg-surface-raised border border-border rounded-xl p-1 gap-1 w-fit">
            <button
              onClick={() => setInputMode("url")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                inputMode === "url" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                inputMode === "upload" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Upload file
            </button>
          </div>

          {inputMode === "url" ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                  placeholder="Paste a .mp4 or .m3u8 URL"
                  className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <button
                onClick={handleLoad}
                disabled={!inputValue.trim()}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Load
              </button>
            </div>
          ) : (
            <UploadPanel onReady={handleUploadReady} />
          )}
        </div>
      )}

      {/* Player */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border group">
        <video ref={videoRef} className="w-full h-full" playsInline />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        )}

        {noVideo && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 select-none">
            <p className="text-sm text-center px-6">
              {isController
                ? "Paste a URL or upload a file above to start"
                : controllerName
                ? `Waiting for ${controllerName} to load a video…`
                : "Waiting for someone to load a video…"}
            </p>
          </div>
        )}

        {!noVideo && !loading && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <PlayerControls
              videoRef={videoRef}
              isController={isController}
              qualityLevels={qualityLevels}
              currentLevel={currentLevel}
              onQualityChange={handleQualityChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}