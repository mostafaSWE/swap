import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Green "Verified" badge shown beside a verified-account user's name. */
export function VerifiedBadge({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-green-light px-2 py-0.5 text-xs font-semibold text-green-dark",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** Green "Verified Item" badge for listings inspected by the Swap team. */
export function ItemVerifiedBadge({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-green px-2 py-0.5 text-xs font-semibold text-white",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      {label}
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
  approved: "bg-green-light text-green-dark",
};

/** Generic colored status pill (listings, reports, verification requests). */
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
