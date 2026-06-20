"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet (mobile) / centered modal (desktop) shell shared across the swap
 * flows. The default z-index (z-50) sits above page chrome; pass `z` to layer
 * above another overlay — e.g. the rating prompt sits above the completion
 * celebration (z-[60]). The caller supplies the body (and footer) as children.
 *
 * Accessibility: announced as role="dialog" aria-modal, labelled by its title,
 * closes on Escape, and moves focus into the panel on open (unless a child
 * already grabbed focus, e.g. an autoFocus input).
 */
export function Sheet({
  title,
  onClose,
  closeLabel,
  z = "z-50",
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  z?: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the dialog on open, unless a child autoFocus already did.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("animate-fade-in fixed inset-0 flex items-end justify-center bg-black/40 sm:items-center", z)}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-slide-up flex max-h-[90dvh] w-full max-w-app flex-col rounded-t-card bg-white outline-none sm:rounded-card"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={closeLabel}>
            <X className="h-5 w-5 text-muted" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
