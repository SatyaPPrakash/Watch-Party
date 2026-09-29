import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { VideoShell } from "../components/VideoShell";
import { TileGrid } from "../components/TileGrid";

export function Room() {
  const { roomCode, peers, localPeer } = useRoom();
  const [copied, setCopied] = useState(false);

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
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm tracking-tight">watch party</span>
          <span className="text-zinc-600 text-xs">
            {totalPeers} {totalPeers === 1 ? "person" : "people"}
          </span>
        </div>
        {roomCode && (
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span className="font-mono tracking-widest">{roomCode}</span>
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
        )}
      </header>

      {/* Main layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 overflow-hidden">
        {/* Video area — takes priority on all screens */}
        <div className="flex-1 min-w-0">
          <VideoShell />
        </div>

        {/* Sidebar on desktop, strip on mobile */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <TileGrid />
        </div>
      </main>
    </motion.div>
  );
}
