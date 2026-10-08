import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Check, Copy, Eye, EyeOff, LayoutGrid, LogOut, Menu, Minimize2, PanelRight, UserCheck, UserRoundX, UsersRound, Video, VideoOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoom } from "../context/RoomContext";
import { Brand } from "../components/Brand";
import { PeerTile } from "../components/PeerTile";
import { ScreenShareStage } from "../components/ScreenShareStage";
import { VideoShell } from "../components/VideoShell";
import { TileGrid } from "../components/TileGrid";

export function Room({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const {
    roomCode,
    peers,
    localPeer,
    localStream,
    peerStreams,
    peerScreenStreams,
    screenSharerId,
    screenShareStream,
    cameraOn,
    micOn,
    isHost,
    joinRequests,
    approveJoinRequest,
    denyJoinRequest,
    leaveRoom,
    dismissRoom,
    socket,
  } = useRoom();
  const [copied, setCopied] = useState(false);
  const [tileLayout, setTileLayout] = useState<"tiles" | "focus">("tiles");
  const [cineMode, setCineMode] = useState(false);
  const [showPeopleWhileSharing, setShowPeopleWhileSharing] = useState(true);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showPlayer, setShowPlayer] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [focusedPeerId, setFocusedPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onRoomClosed = () => {
      leaveRoom();
      onLeaveRoom();
    };
    socket.on("room:closed", onRoomClosed);
    return () => { socket.off("room:closed", onRoomClosed); };
  }, [socket, leaveRoom, onLeaveRoom]);

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPeers = (localPeer ? 1 : 0) + peers.length;
  const screenSharer = peers.find((peer) => peer.id === screenSharerId);
  const focusedPeer = focusedPeerId === localPeer?.id
    ? localPeer ? { ...localPeer, cameraOn, micOn } : null
    : peers.find((peer) => peer.id === focusedPeerId) ?? null;
  const focusedStream = focusedPeerId === localPeer?.id
    ? screenSharerId === localPeer.id ? screenShareStream : localStream
    : focusedPeerId
      ? screenSharerId === focusedPeerId
        ? peerScreenStreams.get(focusedPeerId) ?? null
        : peerStreams.get(focusedPeerId) ?? null
      : null;
  const focusedIsScreenSharer = !!focusedPeerId && screenSharerId === focusedPeerId;
  const sharedStream = screenSharerId === localPeer?.id
    ? screenShareStream
    : screenSharerId ? peerScreenStreams.get(screenSharerId) ?? null : null;
  const showParticipantSidebar = !cineMode && (!screenSharerId || showPeopleWhileSharing);
  const hasJoinRequests = isHost && joinRequests.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-surface flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Brand />
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <span className="text-zinc-400 text-xs">
            {totalPeers} {totalPeers === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="relative flex shrink-0 justify-end">
          <button
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? "Close room menu" : hasJoinRequests ? `Open room menu, ${joinRequests.length} join requests` : "Open room menu"}
            aria-expanded={mobileNavOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-zinc-300 lg:hidden"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            {hasJoinRequests && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-300" />}
          </button>
          <div className={`${mobileNavOpen ? "flex" : "hidden"} absolute right-0 top-full z-50 mt-2 w-[min(90vw,22rem)] flex-col items-stretch gap-2 rounded-xl border border-border bg-surface-raised p-2 shadow-xl lg:static lg:mt-0 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <div className="flex items-center rounded-xl border border-border bg-surface-raised p-1" role="group" aria-label="Participant layout">
            <button
              onClick={() => {
                setTileLayout("tiles");
                setMobileNavOpen(false);
              }}
              aria-pressed={tileLayout === "tiles"}
              title="Roomy participant tiles"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                tileLayout === "tiles" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Tiles</span>
            </button>
            <button
              onClick={() => {
                setTileLayout("focus");
                setMobileNavOpen(false);
              }}
              aria-pressed={tileLayout === "focus"}
              title="Player-focused layout"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                tileLayout === "focus" ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <PanelRight size={14} />
              <span>Focus</span>
            </button>
          </div>
          <button
            onClick={() => {
              setCineMode((enabled) => !enabled);
              setMobileNavOpen(false);
            }}
            aria-pressed={cineMode}
            title={cineMode ? "Show participant sidebar" : "Enter cine mode"}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
              cineMode
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-border bg-surface-raised text-zinc-400 hover:text-white"
            }`}
          >
            {cineMode ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{cineMode ? "Show tiles" : "Cine mode"}</span>
          </button>
          <button
            onClick={() => {
              setShowPlayer((visible) => !visible);
              setCineMode(false);
              setMobileNavOpen(false);
            }}
            aria-pressed={showPlayer}
            title={showPlayer ? "Turn video player off" : "Turn video player on"}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-zinc-300 transition-colors hover:text-white"
          >
            {showPlayer ? <VideoOff size={14} /> : <Video size={14} />}
            <span>{showPlayer ? "Turn player off" : "Turn player on"}</span>
          </button>
          {isHost && (
            <Dialog.Root open={showJoinRequests} onOpenChange={setShowJoinRequests}>
              <Dialog.Trigger asChild>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label={`Join requests: ${joinRequests.length}${hasJoinRequests ? " pending" : ""}`}
                  className={`relative flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                    joinRequests.length
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                      : "border-border bg-surface-raised text-zinc-400 hover:text-white"
                  }`}
                >
                  <UsersRound size={14} />
                  <span>Requests</span>
                  <span>{joinRequests.length}</span>
                  {hasJoinRequests && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-300"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-70" /></span>}
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
                            onClick={() => {
                              denyJoinRequest(request.requestId);
                              if (joinRequests.length === 1) setShowJoinRequests(false);
                            }}
                            title={`Decline ${request.displayName}`}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                          >
                            <UserRoundX size={14} /> Decline
                          </button>
                          <button
                            onClick={() => {
                              approveJoinRequest(request.requestId);
                              if (joinRequests.length === 1) setShowJoinRequests(false);
                            }}
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
                setMobileNavOpen(false);
              }}
              aria-pressed={showParticipantSidebar}
              title={showParticipantSidebar ? "Hide participants" : "Show participants"}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-2.5 py-2 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              <UsersRound size={14} />
              <span>{showParticipantSidebar ? "Hide people" : "Show people"}</span>
            </button>
          )}
          {roomCode && (
            <button
              onClick={() => {
                copyCode();
                setMobileNavOpen(false);
              }}
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
            <span>Leave room</span>
          </button>
          {isHost && (
            <button
              onClick={dismissRoom}
              title="Dismiss room for everyone"
              className="flex items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/20"
            >
              <X size={14} />
              <span>Dismiss room</span>
            </button>
          )}
          </div>
        </div>
      </header>

      <main className={`flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-6 lg:overflow-hidden ${showParticipantSidebar && (showPlayer || focusedPeer) ? "lg:flex-row" : ""}`}>
        {showPlayer && (
          <div className={`${focusedPeer ? "lg:w-[35%]" : showParticipantSidebar ? tileLayout === "tiles" ? "lg:w-[42%] xl:w-[40%]" : "flex-1" : "mx-auto w-full max-w-[1500px]"} min-w-0 shrink-0`}>
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
        )}

        {focusedPeer && (
          <div className="relative mx-auto aspect-video w-full min-w-0 lg:mx-0 lg:aspect-auto lg:flex-1 lg:min-h-0">
            {focusedIsScreenSharer ? (
              <>
                <ScreenShareStage
                  stream={focusedStream}
                  displayName={focusedPeer.displayName}
                  isLocal={focusedPeer.id === localPeer?.id}
                />
                <button
                  onClick={() => setFocusedPeerId(null)}
                  aria-label="Exit participant focus"
                  title="Exit focus"
                  className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/65 text-white backdrop-blur hover:bg-black/85"
                >
                  <Minimize2 size={15} />
                </button>
              </>
            ) : (
              <PeerTile
                peer={focusedPeer}
                stream={focusedStream}
                isLocal={focusedPeer.id === localPeer?.id}
                isFocused
                onFocus={() => setFocusedPeerId(null)}
                fill
              />
            )}
          </div>
        )}

        {showParticipantSidebar && (
          <div className={`${focusedPeer ? "w-full lg:w-56 xl:w-64" : !showPlayer ? "w-full" : tileLayout === "tiles" ? "flex-1 min-h-0" : "lg:w-72 xl:w-80"} min-w-0 shrink-0`}>
            <TileGrid
              layout={tileLayout}
              focusedPeerId={focusedPeerId}
              onFocusPeer={setFocusedPeerId}
            />
          </div>
        )}
        {!showParticipantSidebar && <TileGrid layout={tileLayout} showParticipants={false} />}
      </main>
    </motion.div>
  );
}
