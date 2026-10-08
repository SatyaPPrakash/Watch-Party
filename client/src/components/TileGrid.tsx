import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence } from "framer-motion";
import { Loader2, Mic, MicOff, Monitor, StopCircle, Video, VideoOff } from "lucide-react";
import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { PeerTile } from "./PeerTile";

interface TileGridProps {
  layout: "tiles" | "focus";
  showParticipants?: boolean;
  focusedPeerId?: string | null;
  onFocusPeer?: (peerId: string | null) => void;
}

export function TileGrid({ layout, showParticipants = true, focusedPeerId = null, onFocusPeer }: TileGridProps) {
  const {
    localPeer,
    peers,
    localStream,
    peerStreams,
    cameraOn,
    cameraBusy,
    micOn,
    screenSharerId,
    toggleCamera,
    toggleMic,
    startScreenShare,
    stopScreenShare,
  } = useRoom();
  const [showShareNotice, setShowShareNotice] = useState(false);
  const hasAudioTrack = Boolean(localStream?.getAudioTracks().length);
  const isLocalSharer = !!localPeer && screenSharerId === localPeer.id;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {showParticipants && (
        <div
          className="grid max-h-[58dvh] min-h-[9rem] flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-full sm:gap-3"
          style={{
            gridTemplateColumns: layout === "focus"
              ? "minmax(0, 1fr)"
              : "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
            gridAutoRows: "minmax(9rem, 1fr)",
          }}
        >
          <AnimatePresence>
            {localPeer && localPeer.id !== focusedPeerId && (
              <PeerTile
                key={localPeer.id}
                peer={{ ...localPeer, cameraOn, micOn }}
                stream={localStream}
                isLocal
                screenSharing={screenSharerId === localPeer.id}
                onFocus={onFocusPeer ? () => onFocusPeer(localPeer.id) : undefined}
                fill
              />
            )}
            {peers.filter((peer) => peer.id !== focusedPeerId).map((peer) => (
              <PeerTile
                key={peer.id}
                peer={peer}
                stream={peerStreams.get(peer.id) ?? null}
                screenSharing={screenSharerId === peer.id}
                onFocus={onFocusPeer ? () => onFocusPeer(peer.id) : undefined}
                fill
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Local controls */}
      <div className="sticky bottom-0 z-30 -mx-3 flex flex-wrap items-center justify-center gap-2 border-t border-border/70 bg-surface/95 px-3 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-1 sm:backdrop-blur-none">
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
          disabled={cameraBusy}
          title={cameraOn ? "Turn camera off" : "Turn camera on"}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:cursor-wait disabled:opacity-60 ${
            cameraOn
              ? "bg-surface-raised border-border text-white hover:bg-white/5"
              : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/20"
          }`}
        >
          {cameraBusy ? <Loader2 size={15} className="animate-spin" /> : cameraOn ? <VideoOff size={15} /> : <Video size={15} />}
          {cameraBusy ? "Starting camera" : cameraOn ? "Turn camera off" : "Turn camera on"}
        </button>
        <button
          onClick={() => isLocalSharer ? void stopScreenShare() : setShowShareNotice(true)}
          disabled={!!screenSharerId && !isLocalSharer}
          title={isLocalSharer ? "Stop sharing" : screenSharerId ? "Another participant is sharing" : "Share a screen or browser tab"}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isLocalSharer
              ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "border-border bg-surface-raised text-white hover:bg-white/5"
          }`}
        >
          {isLocalSharer ? <StopCircle size={15} /> : <Monitor size={15} />}
          {isLocalSharer ? "Stop sharing" : "Share screen"}
        </button>
      </div>

      <Dialog.Root open={showShareNotice} onOpenChange={setShowShareNotice}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface-overlay p-6 shadow-2xl">
            <Dialog.Title className="text-base font-semibold text-white">Before you share</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-zinc-400">
              For sound, choose a browser tab and enable tab audio when prompted. Protected or DRM video may appear black because the browser blocks capture; audio availability depends on your browser and selected source.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="rounded-xl border border-border px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
              </Dialog.Close>
              <button
                onClick={() => {
                  setShowShareNotice(false);
                  void startScreenShare();
                }}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim"
              >
                Choose screen
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
