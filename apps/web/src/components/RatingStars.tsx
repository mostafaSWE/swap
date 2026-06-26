"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "h-3.5 w-3.5", md: "h-7 w-7", lg: "h-9 w-9" } as const;

/**
 * A 1–5 star rating control. Read-only when no `onChange` is given (renders
 * `value` filled stars as a single labelled image); interactive otherwise — a
 * proper ARIA radiogroup with roving tabindex and arrow-key navigation
 * (direction-aware so it reads correctly in both LTR and RTL).
 */
export function RatingStars({
  value,
  onChange,
  size = "md",
  groupLabel,
  starLabel,
  className,
}: {
  value: number;
  onChange?: (stars: number) => void;
  size?: keyof typeof SIZES;
  /** Accessible label for the whole control. */
  groupLabel?: string;
  /** Accessible label for each star, e.g. (n) => `${n} of 5`. */
  starLabel?: (stars: number) => string;
  className?: string;
}) {
  const interactive = Boolean(onChange);

  function move(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!onChange) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const up = Math.min((value || 0) + 1, 5);
    const down = value <= 1 ? 1 : value - 1;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowUp":
        next = up;
        break;
      case "ArrowDown":
        next = down;
        break;
      case "ArrowRight":
        next = rtl ? down : up;
        break;
      case "ArrowLeft":
        next = rtl ? up : down;
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
    // Buttons are direct children of the container — move focus to the new star.
    (e.currentTarget.parentElement?.children[next - 1] as HTMLElement | undefined)?.focus();
  }

  return (
    <div
      role={interactive ? "radiogroup" : "img"}
      aria-label={groupLabel}
      className={cn("flex items-center gap-1", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star
            className={cn(SIZES[size], n <= value ? "fill-amber-400 text-amber-400" : "fill-transparent text-faint")}
            aria-hidden
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        // Roving tabindex: only the selected star (or star 1 when nothing is
        // selected yet) sits in the tab order; arrow keys move among the rest.
        const isTabStop = value === n || (value === 0 && n === 1);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={starLabel?.(n)}
            tabIndex={isTabStop ? 0 : -1}
            onClick={() => onChange?.(n)}
            onKeyDown={move}
            className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
