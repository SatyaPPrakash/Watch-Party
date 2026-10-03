import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useUpload, UploadStatus } from "../hooks/useUpload";
import { useRoom } from "../context/RoomContext";

interface UploadPanelProps {
  onReady: (hlsUrl: string) => void;
}

const ACCEPTED = ".mp4,.mkv,.mov,.avi,.webm";

function StatusIcon({ status }: { status: UploadStatus }) {
  if (status === "uploading" || status === "transcoding")
    return <Loader2 size={16} className="animate-spin text-accent" />;
  if (status === "ready")
    return <CheckCircle size={16} className="text-emerald-400" />;
  if (status === "error")
    return <AlertCircle size={16} className="text-red-400" />;
  return null;
}

function statusLabel(status: UploadStatus, progress: number): string {
  if (status === "uploading") return "Uploading…";
  if (status === "transcoding") return `Transcoding ${progress}%`;
  if (status === "ready") return "Ready to play";
  if (status === "error") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "";
}

export function UploadPanel({ onReady }: UploadPanelProps) {
  const { socket, roomCode } = useRoom();
  const { status, progress, errorMsg, uploadFile, cancelUpload, reset } = useUpload({ socket, roomCode, onReady });

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    setFileName(file.name);
    uploadFile(file);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const isActive = status === "uploading" || status === "transcoding";

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="wait">
        {status === "idle" || status === "error" ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragging
                ? "border-accent bg-accent/10"
                : "border-border bg-surface-raised hover:border-zinc-600 hover:bg-surface-overlay"
            }`}
          >
            <Upload size={22} className="text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-300 font-medium">Drop a video file here</p>
              <p className="text-xs text-zinc-600 mt-0.5">MP4, MKV, MOV, AVI, WEBM</p>
            </div>
            {status === "error" && (
              <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </motion.div>
        ) : (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-surface-raised px-4 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileVideo size={15} className="text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-300 truncate">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusIcon status={status} />
                <span className="text-xs text-zinc-500">{statusLabel(status, progress)}</span>
                {isActive ? (
                  <button
                    onClick={cancelUpload}
                    title="Cancel upload"
                    aria-label="Cancel upload"
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <button onClick={reset} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-surface-overlay overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${status === "ready" ? "bg-emerald-400" : "bg-accent"}`}
                initial={{ width: 0 }}
                animate={{ width: `${status === "uploading" ? 15 : progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {status === "transcoding" && progress < 30 && (
              <p className="text-[11px] text-zinc-600 mt-2">
                Playback will start before transcoding finishes
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
