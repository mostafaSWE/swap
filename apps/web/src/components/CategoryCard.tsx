"use client";

import { useLocale } from "next-intl";
import type { Category, Locale } from "@swap/types";
import { localizedName } from "@swap/ui";
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

export function CategoryCard({
  category,
  href,
  className,
}: {
  category: Pick<Category, "name_ar" | "name_en" | "icon">;
  href: string;
  className?: string;
}) {
  const locale = useLocale() as Locale;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full min-h-[104px] flex-col justify-between overflow-hidden rounded-card border border-line bg-surface p-3.5 text-start shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:min-h-[124px] sm:p-4",
        className,
      )}
    >
      <span className="pointer-events-none absolute -end-8 -top-8 h-20 w-20 rounded-full bg-accent/5 transition-transform duration-300 group-hover:scale-125" />
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent transition-all duration-200 group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
        <CategoryIcon icon={category.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <span className="relative mt-3 text-sm font-bold leading-5 text-ink sm:mt-4">{localizedName(category, locale)}</span>
    </Link>
  );
}
