import { useLocale } from "next-intl";
import { CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "./CategoryIcon";

/** Horizontal scroll of category chips linking to filtered listings. */
export function CategoryCarousel() {
  const locale = useLocale() as Locale;

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/listings?category=${cat.slug}`}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-light text-green-dark">
            <CategoryIcon icon={cat.icon} className="h-6 w-6" />
          </span>
          <span className="line-clamp-1 text-center text-[11px] text-muted">
            {localizedName(cat, locale)}
          </span>
        </Link>
      ))}
    </div>
  );
}
