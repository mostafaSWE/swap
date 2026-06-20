"use client";

/**
 * Analytics date-range picker (spec §4.2). Presets (7/30/90 days) and a custom
 * from/to are written to the URL (?from&to) so the server page recomputes every
 * chart for the selected window. Days are UTC YYYY-MM-DD to match the analytics
 * bucketing.
 */
import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function isoDay(d: Date): string {
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

function spanDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / DAY_MS) + 1;
}

export function DateRangePicker({
  from,
  to,
  labels,
}: {
  from: string;
  to: string;
  labels: { from: string; to: string; apply: string; last7: string; last30: string; last90: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const go = (nf: string, nt: string) => {
    router.push(`${pathname}?from=${nf}&to=${nt}`);
  };

  const today = isoDay(new Date());
  const preset = (n: number) => {
    const start = isoDay(new Date(Date.now() - (n - 1) * DAY_MS));
    setF(start);
    setT(today);
    go(start, today);
  };

  const presets = [
    { n: 7, label: labels.last7 },
    { n: 30, label: labels.last30 },
    { n: 90, label: labels.last90 },
  ];
  const activeN = to === today ? spanDays(from, to) : 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.n}
            type="button"
            onClick={() => preset(p.n)}
            className={cn(
              "rounded-pill px-3 py-1.5 text-sm font-medium transition-colors",
              activeN === p.n ? "bg-navy text-white" : "border border-line text-ink hover:bg-canvas",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col text-xs font-semibold text-muted">
        {labels.from}
        <input
          type="date"
          value={f}
          max={t}
          onChange={(e) => setF(e.target.value)}
          className="input-field mt-1 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col text-xs font-semibold text-muted">
        {labels.to}
        <input
          type="date"
          value={t}
          min={f}
          max={today}
          onChange={(e) => setT(e.target.value)}
          className="input-field mt-1 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={() => f && t && go(f, t)}
        className="rounded-pill bg-green px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-dark"
      >
        {labels.apply}
      </button>
    </div>
  );
}
