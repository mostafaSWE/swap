import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * SectionHeader — section title + optional "view all" action. The chevron gets
 * `.rtl-flip` so it points the correct way in both RTL and LTR.
 */
export function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      {actionLabel && href ? (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-semibold text-green-dark hover:underline"
        >
          {actionLabel}
          <ChevronLeft className="rtl-flip h-4 w-4 rotate-180" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
