import { ChevronLeft } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Section title with an optional "view all" link. RTL-aware chevron. */
export function SectionHeader({
  title,
  href,
  viewAllLabel,
}: {
  title: string;
  href?: string;
  viewAllLabel?: string;
}) {
  const locale = useLocale();
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-green">
          {viewAllLabel}
          <ChevronLeft className={locale === "ar" ? "h-4 w-4" : "h-4 w-4 rotate-180"} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
