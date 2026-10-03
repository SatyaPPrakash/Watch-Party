import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { PlaybackAction } from "../types/room";

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isController: boolean;
  qualityLevels: { height: number; index: number }[];
  currentLevel: number;
  onQualityChange: (index: number) => void;
  onPlaybackRequest: (action: PlaybackAction) => void;
}

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerControls({
  videoRef,
  isController,
  qualityLevels,
  currentLevel,
  onQualityChange,
  onPlaybackRequest,
}: PlayerControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuality, setShowQuality] = useState(false);
  const seekingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      if (!seekingRef.current) setCurrentTime(video.currentTime);
    };
    const onDuration = () => setDuration(video.duration);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
    };
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    onPlaybackRequest(video.paused ? "play" : "pause");
  }, [videoRef, onPlaybackRequest]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, [videoRef]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !isController) return;
    seekingRef.current = true;
    const t = Number(e.target.value);
    setCurrentTime(t);
    video.currentTime = t;
    seekingRef.current = false;
  }, [videoRef, isController]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-10">
      <div className="relative mb-2 group">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          disabled={!isController}
          className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer disabled:cursor-default
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100"
          style={{ background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="text-white hover:text-white/80 transition-colors"
          title={isController ? "Control playback" : "Request playback from host"}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>

        <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <span className="text-white/70 text-xs font-mono tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        {isController && (
          <span className="text-[10px] text-accent font-medium px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
            controller
          </span>
        )}

        {qualityLevels.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowQuality((v) => !v)}
              className="text-white/70 hover:text-white text-xs font-mono transition-colors"
            >
              {currentLevel === -1 ? "auto" : `${qualityLevels[currentLevel]?.height}p`}
            </button>
            {showQuality && (
              <div className="absolute bottom-7 right-0 bg-surface-overlay border border-border rounded-xl overflow-hidden text-xs w-20">
                <button
                  onClick={() => { onQualityChange(-1); setShowQuality(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-white/5 text-white/80"
                >
                  auto
                </button>
                {[...qualityLevels].reverse().map((l) => (
                  <button
                    key={l.index}
                    onClick={() => { onQualityChange(l.index); setShowQuality(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-white/5 text-white/80"
                  >
                    {l.height}p
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}