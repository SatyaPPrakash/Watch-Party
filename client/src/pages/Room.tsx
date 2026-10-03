import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Check, Copy, Eye, EyeOff, LayoutGrid, LogOut, PanelRight, UserCheck, UserRoundX, UsersRound } from "lucide-react";
import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { Brand } from "../components/Brand";
import { ScreenShareStage } from "../components/ScreenShareStage";
import { VideoShell } from "../components/VideoShell";
import { TileGrid } from "../components/TileGrid";

export function Room({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const {
    roomCode,
    peers,
    localPeer,
    peerStreams,
    screenSharerId,
    screenShareStream,
    isHost,
    joinRequests,
    approveJoinRequest,
    denyJoinRequest,
    leaveRoom,
  } = useRoom();
  const [copied, setCopied] = useState(false);
  const [tileLayout, setTileLayout] = useState<"tiles" | "focus">("tiles");
  const [cineMode, setCineMode] = useState(false);
  const [showPeopleWhileSharing, setShowPeopleWhileSharing] = useState(true);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPeers = (localPeer ? 1 : 0) + peers.length;
  const screenSharer = peers.find((peer) => peer.id === screenSharerId);
  const sharedStream = screenSharerId === localPeer?.id
    ? screenShareStream
    : screenSharerId ? peerStreams.get(screenSharerId) ?? null : null;
  const showParticipantSidebar = !cineMode && (!screenSharerId || showPeopleWhileSharing);

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
          {isHost && (
            <Dialog.Root open={showJoinRequests} onOpenChange={setShowJoinRequests}>
              <Dialog.Trigger asChild>
                <button
                  aria-label={`Join requests: ${joinRequests.length}`}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                    joinRequests.length
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                      : "border-border bg-surface-raised text-zinc-400 hover:text-white"
                  }`}
                >
                  <UsersRound size={14} />
                  <span className="hidden sm:inline">Requests</span>
                  <span>{joinRequests.length}</span>
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface-overlay p-5 shadow-2xl">
                  <Dialog.Title className="text-base font-semibold text-white">Room access requests</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-zinc-400">
                    Admit only people you recognize. The room code alone does not grant access.
                  </Dialog.Description>
                  <div className="mt-4 flex flex-col gap-2">
                    {joinRequests.length === 0 ? (
                      <p className="rounded-xl bg-surface-raised px-3 py-4 text-center text-sm text-zinc-500">No pending requests</p>
                    ) : joinRequests.map((request) => (
                      <div key={request.requestId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-3 py-2.5">
                        <span className="min-w-0 truncate text-sm text-white">{request.displayName}</span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => denyJoinRequest(request.requestId)}
                            title={`Decline ${request.displayName}`}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                          >
                            <UserRoundX size={14} /> Decline
                          </button>
                          <button
                            onClick={() => approveJoinRequest(request.requestId)}
                            title={`Admit ${request.displayName}`}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-300/15 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-300/25"
                          >
                            <UserCheck size={14} /> Admit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          {screenSharerId && (
            <button
              onClick={() => {
                if (showParticipantSidebar) {
                  setShowPeopleWhileSharing(false);
                } else {
                  setCineMode(false);
                  setShowPeopleWhileSharing(true);
                }
              }}
              aria-pressed={showParticipantSidebar}
              title={showParticipantSidebar ? "Hide participants" : "Show participants"}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-2.5 py-2 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              <UsersRound size={14} />
              <span className="hidden sm:inline">{showParticipantSidebar ? "Hide people" : "Show people"}</span>
            </button>
          )}
          {roomCode && (
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span className="font-mono tracking-widest">{roomCode}</span>
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          )}
          <button
            onClick={() => {
              leaveRoom();
              onLeaveRoom();
            }}
            title="Leave room"
            aria-label="Leave room"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-2.5 py-2 text-xs text-zinc-400 transition-colors hover:border-red-400/30 hover:text-red-300"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      <main className={`flex-1 min-h-0 flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto lg:overflow-hidden ${showParticipantSidebar ? "lg:flex-row" : ""}`}>
        <div className={`${showParticipantSidebar ? tileLayout === "tiles" ? "lg:w-[42%] xl:w-[40%]" : "flex-1" : "mx-auto w-full max-w-[1500px]"} min-w-0 shrink-0`}>
          <div className={screenSharerId ? "hidden" : "block"}>
            <VideoShell />
          </div>
          {screenSharerId ? (
            <ScreenShareStage
              stream={sharedStream}
              displayName={screenSharer?.displayName ?? localPeer?.displayName ?? "Participant"}
              isLocal={screenSharerId === localPeer?.id}
            />
          ) : null}
        </div>

        {showParticipantSidebar && (
          <div className={`${tileLayout === "tiles" ? "flex-1 min-h-0" : "lg:w-72 xl:w-80"} min-w-0 shrink-0`}>
            <TileGrid layout={tileLayout} />
          </div>
        )}
        {!showParticipantSidebar && <TileGrid layout={tileLayout} showParticipants={false} />}
      </main>
    </motion.div>
  );
}
