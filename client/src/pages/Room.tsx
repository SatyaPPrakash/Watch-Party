import { motion } from "framer-motion";
import { Copy, Check, Eye, EyeOff, LayoutGrid, PanelRight } from "lucide-react";
import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { Brand } from "../components/Brand";
import { VideoShell } from "../components/VideoShell";
import { TileGrid } from "../components/TileGrid";

export function Room() {
  const { roomCode, peers, localPeer } = useRoom();
  const [copied, setCopied] = useState(false);
  const [tileLayout, setTileLayout] = useState<"tiles" | "focus">("tiles");
  const [cineMode, setCineMode] = useState(false);

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPeers = (localPeer ? 1 : 0) + peers.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-surface flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <Brand />
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <span className="text-zinc-400 text-xs">
            {totalPeers} {totalPeers === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-surface-raised p-1" role="group" aria-label="Participant layout">
            <button
              onClick={() => setTileLayout("tiles")}
              aria-pressed={tileLayout === "tiles"}
              title="Roomy participant tiles"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                tileLayout === "tiles" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Tiles</span>
            </button>
            <button
              onClick={() => setTileLayout("focus")}
              aria-pressed={tileLayout === "focus"}
              title="Player-focused layout"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                tileLayout === "focus" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <PanelRight size={14} />
              <span className="hidden sm:inline">Focus</span>
            </button>
          </div>
          <button
            onClick={() => setCineMode((enabled) => !enabled)}
            aria-pressed={cineMode}
            title={cineMode ? "Show participant sidebar" : "Enter cine mode"}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
              cineMode
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-border bg-surface-raised text-zinc-400 hover:text-white"
            }`}
          >
            {cineMode ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="hidden sm:inline">{cineMode ? "Show tiles" : "Cine mode"}</span>
          </button>
          {roomCode && (
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span className="font-mono tracking-widest">{roomCode}</span>
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </header>

      <main className={`flex-1 min-h-0 flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto lg:overflow-hidden ${cineMode ? "" : "lg:flex-row"}`}>
        <div className={`${cineMode ? "mx-auto w-full max-w-[1500px]" : tileLayout === "tiles" ? "lg:w-[42%] xl:w-[40%]" : "flex-1"} min-w-0 shrink-0`}>
          <VideoShell />
        </div>

        {!cineMode && (
          <div className={`${tileLayout === "tiles" ? "flex-1 min-h-0" : "lg:w-72 xl:w-80"} min-w-0 shrink-0`}>
            <TileGrid layout={tileLayout} />
          </div>
        )}
        {cineMode && <TileGrid layout={tileLayout} showParticipants={false} />}
      </main>
    </motion.div>
  );
}
