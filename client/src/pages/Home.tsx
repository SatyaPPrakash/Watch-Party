import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { useRoom } from "../context/RoomContext";
import { useError } from "../context/ErrorContext";
import { Brand } from "../components/Brand";

interface HomeProps {
  onEnterRoom: () => void;
}

function getSavedDisplayName() {
  try {
    return localStorage.getItem("watch-party.display-name") ?? "";
  } catch {
    return "";
  }
}

export function Home({ onEnterRoom }: HomeProps) {
  const { createRoom, joinRoom, joinRequestPending, cancelJoinRequest } = useRoom();
  const { showError } = useError();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState(getSavedDisplayName);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (displayName) localStorage.setItem("watch-party.display-name", displayName);
      else localStorage.removeItem("watch-party.display-name");
    } catch {
      return;
    }
  }, [displayName]);

  const handleCreate = async () => {
    if (!displayName.trim()) return showError("Display name required", "Enter your name before creating a room.");
    setLoading(true);
    try {
      await createRoom(displayName.trim());
      onEnterRoom();
    } catch {
      // error already surfaced via ErrorContext
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!displayName.trim()) return showError("Display name required", "Enter your name before joining.");
    if (!code.trim()) return showError("Room code required", "Paste or type the 6-character room code.");
    setLoading(true);
    try {
      await joinRoom(code.trim(), displayName.trim());
      onEnterRoom();
    } catch {
      // error already surfaced via ErrorContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <Brand />
        </div>

        {/* Card */}
        <div className="bg-surface-raised border border-border rounded-3xl p-6">
          {/* Tab switcher */}
          <div className="flex bg-surface rounded-xl p-1 mb-6 gap-1">
            {(["create", "join"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? "bg-surface-overlay text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "create" ? "New room" : "Join room"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                placeholder="e.g. Prakash"
                maxLength={24}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {tab === "join" && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Room code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 font-mono tracking-widest focus:outline-none focus:border-accent/50 transition-colors uppercase"
                />
              </div>
            )}

            <button
              onClick={tab === "create" ? handleCreate : handleJoin}
              disabled={loading}
              aria-busy={loading}
              className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {joinRequestPending ? "Waiting for host" : tab === "create" ? "Starting room" : "Joining room"}
                </>
              ) : (
                <>
                  {tab === "create" ? <Users size={15} /> : <ArrowRight size={15} />}
                  {tab === "create" ? "Create room" : "Join"}
                </>
              )}
            </button>
            {loading && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-3.5 py-3"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Loader2 size={17} className="animate-spin" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-200">
                    {joinRequestPending ? "Waiting for the host" : tab === "create" ? "Preparing your room" : "Connecting to the room"}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {joinRequestPending
                      ? "Your request is sent. You can cancel it below."
                      : "Allow your camera and microphone, then we’ll connect you."}
                  </span>
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/70 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/40 [animation-delay:300ms]" />
                </span>
              </motion.div>
            )}
            {joinRequestPending && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                <p className="text-xs text-zinc-400">The host must admit you to the room.</p>
                <button
                  onClick={cancelJoinRequest}
                  className="shrink-0 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
                >
                  Cancel request
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          No account needed — share the room code with friends.
        </p>
      </motion.div>
    </div>
  );
}
