import { Inbox, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered loading spinner. */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-10 text-muted", className)}>
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
    </div>
  );
}

/** Empty state with a tinted icon tile, title, description and optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-canvas text-muted">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden />}
      </span>
      <p className="text-balance text-base font-bold text-ink">{title}</p>
      {description ? <p className="max-w-xs text-pretty text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Error state with a retry action. */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-300">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </span>
      <p className="text-base font-bold text-ink">{title}</p>
      {description ? <p className="max-w-xs text-pretty text-sm text-muted">{description}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-primary mt-1 !py-2.5 text-sm">
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
