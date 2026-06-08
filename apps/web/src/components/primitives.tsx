import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered loading spinner. */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-10 text-muted", className)}>
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
    </div>
  );
}

/** Empty state with optional icon, title, description and action. */
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
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon ? <div className="mb-2 text-muted">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
