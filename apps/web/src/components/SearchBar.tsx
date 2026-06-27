"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRIES, COUNTRY_BY_ID, CITY_BY_ID, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { useRouter } from "@/i18n/navigation";
import { SelectInput } from "./forms";
import { cn } from "@/lib/utils";

/**
 * Search input with a built-in location dropdown (country → city). Submitting
 * routes to the listings page with `search`, `country` and `city` query params,
 * preserving any other active listing filters already in the URL.
 */
export function SearchBar({
  defaultValue = "",
  defaultCountry = "",
  defaultCity = "",
}: {
  defaultValue?: string;
  defaultCountry?: string;
  defaultCity?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [value, setValue] = useState(defaultValue);
  const [country, setCountry] = useState(defaultCountry);
  const [city, setCity] = useState(defaultCity);
  const [locOpen, setLocOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  // Close the location popover when clicking outside it.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setLocOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const cities = country ? citiesByCountry(country) : [];

  const selectedCity = city ? CITY_BY_ID[city] : undefined;
  const selectedCountry = country ? COUNTRY_BY_ID[country] : undefined;
  const locationLabel = selectedCity
    ? localizedName(selectedCity, locale)
    : selectedCountry
      ? localizedName(selectedCountry, locale)
      : t("allLocations");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Preserve other active listing filters (category, condition, sort, …)
    // while updating search + location from this bar. Read them at submit time
    // so the bar stays a fully static component (no useSearchParams de-opt).
    const current = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const params = new URLSearchParams();
    for (const key of ["category", "condition", "sort", "featured"]) {
      const v = current.get(key);
      if (v) params.set(key, v);
    }
    const q = value.trim();
    if (q) params.set("search", q);
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  }

  return (
    <form onSubmit={submit} className="relative">
      <div className="grid grid-cols-[minmax(0,1fr)_3.25rem] gap-2 rounded-2xl border border-line bg-field p-2 shadow-sm transition-colors focus-within:border-accent sm:flex sm:items-stretch sm:gap-1 sm:p-1">
        {/* Location filter */}
        <div className="relative order-3 col-span-2 min-w-0 sm:order-none sm:col-span-auto sm:shrink-0" ref={locRef}>
          <button
            type="button"
            onClick={() => setLocOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={locOpen}
            aria-label={t("location")}
            className="flex h-11 w-full max-w-none items-center justify-center gap-1.5 rounded-xl bg-canvas/45 px-3 text-sm font-semibold text-ink transition-colors hover:bg-elevated sm:h-full sm:max-w-[11rem] sm:justify-start sm:bg-transparent"
          >
            <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="truncate">{locationLabel}</span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-muted transition-transform", locOpen && "rotate-180")}
              aria-hidden
            />
          </button>

          {locOpen ? (
            <div className="absolute start-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-elevated">
              <SelectInput
                label={t("country")}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCity("");
                }}
                options={[
                  { value: "", label: t("allLocations") },
                  ...COUNTRIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
                ]}
              />
              <SelectInput
                label={t("city")}
                value={city}
                disabled={!country}
                onChange={(e) => setCity(e.target.value)}
                options={[
                  { value: "", label: t("all") },
                  ...cities.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
                ]}
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCountry("");
                    setCity("");
                  }}
                  className="text-sm font-semibold text-muted transition-colors hover:text-ink"
                >
                  {t("reset")}
                </button>
                <button
                  type="button"
                  onClick={() => setLocOpen(false)}
                  className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {t("apply")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <span className="my-1.5 hidden w-px shrink-0 bg-line sm:block" aria-hidden />

        {/* Search text */}
        <div className="relative order-1 min-w-0 sm:order-none sm:flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("search")}
            aria-label={t("searchAction")}
            className="h-12 w-full border-0 bg-transparent py-0 pe-2 ps-10 text-ink outline-none placeholder:text-muted sm:h-auto sm:py-2.5"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="order-2 flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover sm:order-none sm:min-h-0 sm:px-4"
        >
          <Search className="h-4 w-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{t("searchAction")}</span>
        </button>
      </div>
    </form>
  );
}
