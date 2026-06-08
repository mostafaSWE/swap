"use client";

import { useLocale } from "next-intl";
import type { Category, Locale } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

/**
 * CategoryPill — tappable category chip with icon. Used in the home category rail
 * and the browse filters. `active` highlights the current selection.
 *
 * `category` may be a real Category or a synthetic "All" entry — anything with
 * `name_ar`/`name_en`/`icon`. Uses the locale-aware Link so the `/ar`|`/en`
 * prefix is preserved.
 */
export function CategoryPill({
  category,
  active,
  onClick,
  href,
}: {
  category: Pick<Category, "name_ar" | "name_en" | "icon">;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const locale = useLocale() as Locale;
  const label = locale === "ar" ? category.name_ar : category.name_en;

  const inner = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          active ? "bg-white" : "bg-canvas",
        )}
      >
        <CategoryIcon icon={category.icon} className="h-[22px] w-[22px]" />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </>
  );

  const cls = cn(
    "flex shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition-all",
    active
      ? "border-green bg-green-light text-green-dark"
      : "border-line bg-white text-navy hover:border-green/40 hover:bg-canvas",
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
