import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { useRoom } from "../context/RoomContext";
import { useError } from "../context/ErrorContext";
import { Brand } from "../components/Brand";

interface HomeProps {
  onEnterRoom: () => void;
}

export function Home({ onEnterRoom }: HomeProps) {
  const { createRoom, joinRoom } = useRoom();
  const { showError } = useError();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

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
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 font-mono tracking-widest focus:outline-none focus:border-accent/50 transition-colors uppercase"
                />
              </div>
            )}

            <button
              onClick={tab === "create" ? handleCreate : handleJoin}
              disabled={loading}
              className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {tab === "create" ? <Users size={15} /> : <ArrowRight size={15} />}
                  {tab === "create" ? "Create room" : "Join"}
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          No account needed — share the room code with friends.
        </p>
      </motion.div>
    </div>
  );
}
