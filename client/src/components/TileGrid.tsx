import { AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useRoom } from "../context/RoomContext";
import { PeerTile } from "./PeerTile";

export function TileGrid() {
  const { localPeer, peers, localStream, peerStreams, cameraOn, micOn, toggleCamera, toggleMic } =
    useRoom();
  const hasAudioTrack = Boolean(localStream?.getAudioTracks().length);

  return (
    <div className="flex flex-col gap-3">
      {/* Tile grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <AnimatePresence>
          {localPeer && (
            <PeerTile
              key={localPeer.id}
              peer={{ ...localPeer, cameraOn, micOn }}
              stream={localStream}
              isLocal
            />
          )}
          {peers.map((peer) => (
            <PeerTile
              key={peer.id}
              peer={peer}
              stream={peerStreams.get(peer.id) ?? null}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Local controls */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          onClick={toggleMic}
          disabled={!hasAudioTrack}
          title={hasAudioTrack ? undefined : "No microphone available"}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            micOn
              ? "bg-surface-raised border-border text-white hover:bg-white/5"
              : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          }`}
        >
          {micOn ? <Mic size={15} /> : <MicOff size={15} />}
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            cameraOn
              ? "bg-surface-raised border-border text-white hover:bg-white/5"
              : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/20"
          }`}
        >
          {cameraOn ? <Video size={15} /> : <VideoOff size={15} />}
          {cameraOn ? "Hide camera" : "Show camera"}
        </button>
      </div>
    </div>
  );
}
