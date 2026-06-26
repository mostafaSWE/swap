"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Compact, collapsible safety notes for the listing page. Replaces the heavy
 * always-open amber list with three key points the viewer can expand on demand —
 * keeping the message present without dominating the page. The full disclaimer
 * still lives on the dedicated /safety page and the proposal flow.
 */
const POINTS = ["meetPublic", "noOwn", "userResponsibility"] as const;

export function SafetyNotes() {
  const t = useTranslations("safety");
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="overflow-hidden rounded-card border border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/40"
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span className="flex-1 text-sm font-bold text-amber-900 dark:text-amber-300">{t("notesTitle")}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-amber-600 transition-transform dark:text-amber-400", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2 px-4 pb-4 text-sm text-amber-800 dark:text-amber-200/90">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span className="leading-6">{t(`points.${p}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
