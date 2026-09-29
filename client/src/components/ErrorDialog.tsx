import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useError } from "../context/ErrorContext";

export function ErrorDialog() {
  const { error, clearError } = useError();

  return (
    <Dialog.Root open={!!error} onOpenChange={(open) => !open && clearError()}>
      <AnimatePresence>
        {error && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-overlay border border-border rounded-2xl p-6 shadow-xl"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 p-2 rounded-xl bg-red-500/10 text-red-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-white font-semibold text-base mb-1">
                      {error.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-zinc-400 text-sm leading-relaxed">
                      {error.message}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                      <X size={18} />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="mt-5 flex justify-end">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-sm text-white hover:bg-white/5 transition-colors">
                      Got it
                    </button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
