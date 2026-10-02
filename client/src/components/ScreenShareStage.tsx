import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";

interface ScreenShareStageProps {
  stream: MediaStream | null;
  displayName: string;
  isLocal: boolean;
}

export function ScreenShareStage({ stream, displayName, isLocal }: ScreenShareStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      <video ref={videoRef} autoPlay playsInline muted={isLocal} className="h-full w-full object-contain" />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <Monitor size={28} />
          <span className="text-sm">Connecting to {displayName}&apos;s shared screen…</span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/65 px-3 py-1.5 text-xs text-white backdrop-blur">
        {displayName}{isLocal ? " · sharing your screen" : " · sharing screen"}
      </div>
    </div>
  );
}