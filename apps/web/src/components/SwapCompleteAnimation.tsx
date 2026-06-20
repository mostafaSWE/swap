"use client";

import { useEffect, useRef } from "react";
import { Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Deal-closed celebration: the swap-circle motif (the brand's signature element)
 * animates once when a swap reaches `completed`. Auto-dismisses after a beat;
 * tap anywhere to dismiss. Honors prefers-reduced-motion (handled in globals.css).
 */
export function SwapCompleteAnimation({ onDone }: { onDone: () => void }) {
  const t = useTranslations("proposal");

  // Set the auto-dismiss timer ONCE on mount. Read onDone through a ref so a
  // parent re-render (e.g. a Realtime/chat update) can't recreate the callback
  // identity and restart the timer, which would push the dismissal out.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-ink/80 px-8 text-center"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="animate-swap-ring absolute inset-0 rounded-full bg-green/40" aria-hidden />
        <span className="animate-swap-pop flex h-24 w-24 items-center justify-center rounded-full bg-green text-white shadow-elevated">
          <Repeat2 className="h-12 w-12" aria-hidden />
        </span>
      </div>
      <div className="animate-slide-up">
        <p className="text-2xl font-extrabold text-white">{t("completeTitle")}</p>
        <p className="mt-1 max-w-xs text-sm text-white/80">{t("completeBody")}</p>
      </div>
    </div>
  );
}
