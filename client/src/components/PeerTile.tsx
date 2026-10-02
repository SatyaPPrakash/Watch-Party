import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MicOff, VideoOff, Mic, Video } from "lucide-react";
import { Peer } from "../types/room";
import { useRoom } from "../context/RoomContext";

interface PeerTileProps {
  peer: Peer;
  stream: MediaStream | null;
  isLocal?: boolean;
}

export function PeerTile({ peer, stream, isLocal = false }: PeerTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { remoteMute, remoteHideCamera } = useRoom();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream && peer.cameraOn) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }
  }, [stream, peer.cameraOn]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative aspect-video w-full bg-surface-raised rounded-xl overflow-hidden border border-border group"
    >
      {/* Video feed */}
      {peer.cameraOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-raised">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-surface-overlay border border-border flex items-center justify-center text-xl font-semibold text-zinc-300 select-none">
              {peer.displayName[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-zinc-500">{peer.displayName}</span>
          </div>
        </div>
      )}

      {/* Bottom bar — always visible */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-xs text-white font-medium truncate drop-shadow">
          {peer.displayName}
          {isLocal && <span className="text-zinc-400 ml-1">(you)</span>}
        </span>
        <div className="flex items-center gap-1">
          {!peer.micOn && (
            <span className="p-1 rounded-md bg-red-500/30 text-red-400">
              <MicOff size={11} />
            </span>
          )}
          {!peer.cameraOn && (
            <span className="p-1 rounded-md bg-zinc-700/60 text-zinc-400">
              <VideoOff size={11} />
            </span>
          )}
        </div>
      </div>

      {/* Hover overlay — remote controls (only for other peers) */}
      {!isLocal && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-3">
          <button
            onClick={() => remoteMute(peer.id)}
            title={peer.micOn ? "Mute this person" : "Already muted"}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors ${
              peer.micOn
                ? "bg-red-500/20 hover:bg-red-500/40 text-red-300"
                : "bg-zinc-700/40 text-zinc-500 cursor-not-allowed"
            }`}
            disabled={!peer.micOn}
          >
            {peer.micOn ? <Mic size={16} /> : <MicOff size={16} />}
            <span className="text-[10px]">{peer.micOn ? "Mute" : "Muted"}</span>
          </button>

          <button
            onClick={() => remoteHideCamera(peer.id)}
            title={peer.cameraOn ? "Hide their camera" : "Already hidden"}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors ${
              peer.cameraOn
                ? "bg-zinc-600/30 hover:bg-zinc-600/60 text-zinc-300"
                : "bg-zinc-700/40 text-zinc-500 cursor-not-allowed"
            }`}
            disabled={!peer.cameraOn}
          >
            {peer.cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
            <span className="text-[10px]">{peer.cameraOn ? "Hide cam" : "Hidden"}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}