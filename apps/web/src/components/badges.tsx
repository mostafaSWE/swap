import { Repeat2, Star } from "lucide-react";
import type { SwapProposalStatus } from "@swap/types";
import { cn } from "@/lib/utils";

/**
 * Trust signal: the number of swaps a user has completed (each side gets +1 on a
 * completed, undisputed swap). Replaces the old account/identity "verified" badge
 * — JustSwap does not verify identity. Renders nothing for brand-new users (0 swaps).
 */
export function SwapCountBadge({
  count,
  label,
  className,
}: {
  count: number;
  label: string;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-green-light px-2 py-0.5 text-[11px] font-bold text-green-dark",
        className,
      )}
    >
      <Repeat2 className="h-3.5 w-3.5" aria-hidden />
      {count} {label}
    </span>
  );
}

/**
 * Reputation signal: a user's average rating + how many ratings it's based on
 * (spec §3.6/§3.9). Renders nothing until the user has at least one rating, so a
 * brand-new account never shows a misleading "0". `rating` may arrive as a
 * numeric string from PostgREST, so coerce before formatting.
 */
export function RatingBadge({
  rating,
  count,
  ariaLabel,
  className,
}: {
  rating: number | null;
  count: number;
  ariaLabel?: string;
  className?: string;
}) {
  if (!count || rating == null) return null;
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700",
        className,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
      {Number(rating).toFixed(1)}
      <span className="font-semibold opacity-70">· {count}</span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-light text-green-dark",
  hidden: "bg-amber-100 text-amber-700",
  removed: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  reviewed: "bg-blue-100 text-blue-700",
  resolved: "bg-green-light text-green-dark",
  rejected: "bg-red-100 text-red-700",
};

const PROPOSAL_STATUS_STYLES: Record<SwapProposalStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  countered: "bg-blue-100 text-blue-700",
  agreed: "bg-green-light text-green-dark",
  awaiting_confirmation: "bg-violet-100 text-violet-700",
  completed: "bg-green-light text-green-dark",
  disputed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

/** Swap-proposal lifecycle pill — shown on conversation rows + the chat context card. */
export function ProposalStatusBadge({
  status,
  label,
  className,
}: {
  status: SwapProposalStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-bold",
        PROPOSAL_STATUS_STYLES[status],
        className,
      )}
    >
      <Repeat2 className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

/** Generic colored status pill (listings, reports). */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {label ?? status}
    </span>
  );
}
