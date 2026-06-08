import { cn } from "@/lib/utils";

/**
 * Swap logo: two curved arrows forming an exchange symbol (navy + green),
 * with the wordmark. `withText` toggles the wordmark.
 */
export function Logo({ withText = true, className }: { withText?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        {/* top arrow → (green) */}
        <path
          d="M7 11h14l-3-3M21 11l-3 3"
          stroke="#18B66A"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* bottom arrow ← (navy) */}
        <path
          d="M25 21H11l3 3M11 21l3-3"
          stroke="#0B1324"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText ? <span className="text-lg font-extrabold tracking-tight text-navy">Swap</span> : null}
    </span>
  );
}
