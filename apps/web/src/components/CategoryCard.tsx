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
        "group flex h-full min-h-[132px] flex-col justify-between rounded-card border border-line bg-white p-4 text-start shadow-card transition-all hover:-translate-y-0.5 hover:border-green/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-light text-green-dark transition-colors group-hover:bg-green group-hover:text-white">
        <CategoryIcon icon={category.icon} className="h-6 w-6" />
      </span>
      <span className="mt-4 text-sm font-bold leading-5 text-ink">{localizedName(category, locale)}</span>
    </Link>
  );
}
