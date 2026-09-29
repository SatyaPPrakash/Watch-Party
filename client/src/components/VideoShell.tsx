import { Film } from "lucide-react";
import { useRoom } from "../context/RoomContext";

export function VideoShell() {
  const { roomCode } = useRoom();

  return (
    <div className="relative w-full aspect-video bg-surface-raised rounded-2xl border border-border flex items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center gap-3 text-zinc-600 select-none">
        <Film size={40} strokeWidth={1.5} />
        <p className="text-sm">Video player coming in checkpoint 2</p>
      </div>

      {/* Room code badge */}
      {roomCode && (
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-surface-overlay border border-border text-xs font-mono text-zinc-400">
          {roomCode}
        </div>
      )}
    </div>
  );
}
