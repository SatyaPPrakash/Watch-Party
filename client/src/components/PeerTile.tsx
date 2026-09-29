import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MicOff, VideoOff } from "lucide-react";
import { Peer } from "../types/room";

interface PeerTileProps {
  peer: Peer;
  stream: MediaStream | null;
  isLocal?: boolean;
}

export function PeerTile({ peer, stream, isLocal = false }: PeerTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative aspect-video bg-surface-raised rounded-2xl overflow-hidden border border-border"
    >
      {peer.cameraOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-surface-overlay border border-border flex items-center justify-center text-lg font-semibold text-zinc-300 select-none">
            {peer.displayName[0]?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Name + status bar */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-xs text-white font-medium truncate">
          {peer.displayName}
          {isLocal && <span className="text-zinc-400 ml-1">(you)</span>}
        </span>
        <div className="flex items-center gap-1">
          {!peer.micOn && (
            <span className="p-1 rounded-md bg-red-500/20 text-red-400">
              <MicOff size={11} />
            </span>
          )}
          {!peer.cameraOn && (
            <span className="p-1 rounded-md bg-zinc-500/20 text-zinc-400">
              <VideoOff size={11} />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
