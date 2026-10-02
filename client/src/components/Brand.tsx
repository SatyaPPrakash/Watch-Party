import { Clapperboard } from "lucide-react";

export function Brand() {
  return (
    <div className="inline-flex items-center gap-2.5" aria-label="Watch Party">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300">
        <Clapperboard size={17} strokeWidth={2} />
      </span>
      <span className="inline-flex items-baseline gap-1 text-[15px] leading-none">
        <span className="font-semibold text-white">Watch</span>
        <span className="font-medium text-emerald-300">Party</span>
      </span>
    </div>
  );
}