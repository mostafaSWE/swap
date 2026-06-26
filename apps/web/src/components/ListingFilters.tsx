"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { TOP_LEVEL_CATEGORIES, COUNTRIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SelectInput } from "./forms";
import { cn } from "@/lib/utils";

export interface ActiveFilters {
  category?: string; // slug
  country?: string; // id
  city?: string; // id
  condition?: string;
  sort?: string;
  search?: string;
  featured?: string;
}

/** URL-driven filter bar for the listings page. */
export function ListingFilters({ active }: { active: ActiveFilters }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function update(patch: Partial<ActiveFilters>) {
    const next: ActiveFilters = { ...active, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const cities = active.country ? citiesByCountry(active.country) : [];

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => update({ category: undefined })}
          className={cn("chip", !active.category && "border-green bg-green-light text-green-dark")}
        >
          {t("common.all")}
        </button>
        {TOP_LEVEL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => update({ category: c.slug })}
            className={cn(
              "chip",
              active.category === c.slug && "border-green bg-green-light text-green-dark",
            )}
          >
            {localizedName(c, locale)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t("listings.filters")}
        </button>
        <SelectInput
          value={active.sort ?? "newest"}
          onChange={(e) => update({ sort: e.target.value })}
          options={[
            { value: "newest", label: t("sort.newest") },
            { value: "most_viewed", label: t("sort.most_viewed") },
          ]}
          className="!w-auto !py-2 text-sm"
        />
      </div>

      {open ? (
        <div className="grid gap-3 sm:grid-cols-2 rounded-card border border-line bg-surface p-3">
          <SelectInput
            label={t("common.country")}
            value={active.country ?? ""}
            onChange={(e) => update({ country: e.target.value || undefined, city: undefined })}
            options={[
              { value: "", label: t("common.all") },
              ...COUNTRIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
            ]}
          />
          <SelectInput
            label={t("common.city")}
            value={active.city ?? ""}
            disabled={!active.country}
            onChange={(e) => update({ city: e.target.value || undefined })}
            options={[
              { value: "", label: t("common.all") },
              ...cities.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
            ]}
          />
          <SelectInput
            label={t("common.condition")}
            value={active.condition ?? ""}
            onChange={(e) => update({ condition: e.target.value || undefined })}
            options={[
              { value: "", label: t("common.all") },
              { value: "new", label: t("condition.new") },
              { value: "used", label: t("condition.used") },
            ]}
          />
          <SelectInput
            label={t("listings.featured")}
            value={active.featured ?? ""}
            onChange={(e) => update({ featured: e.target.value || undefined })}
            options={[
              { value: "", label: t("common.all") },
              { value: "true", label: t("listings.featuredOnly") },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
