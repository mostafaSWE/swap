"use client";

import { useLocale } from "next-intl";
import { COUNTRIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { SelectInput } from "./forms";

/**
 * Controlled country + city pair. Sources data from @swap/config (the same
 * fixed IDs used by the database seed). Used in signup, the new-listing form,
 * and search filters.
 */
export function CountryCitySelector({
  countryId,
  cityId,
  onCountryChange,
  onCityChange,
  countryLabel,
  cityLabel,
  countryPlaceholder,
  cityPlaceholder,
  includeAllOption,
  allLabel,
}: {
  countryId: string;
  cityId: string;
  onCountryChange: (id: string) => void;
  onCityChange: (id: string) => void;
  countryLabel?: string;
  cityLabel?: string;
  countryPlaceholder?: string;
  cityPlaceholder?: string;
  includeAllOption?: boolean;
  allLabel?: string;
}) {
  const locale = useLocale() as Locale;
  const cities = countryId ? citiesByCountry(countryId) : [];

  const countryOptions = [
    ...(includeAllOption ? [{ value: "", label: allLabel ?? "—" }] : []),
    ...COUNTRIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
  ];
  const cityOptions = [
    ...(includeAllOption ? [{ value: "", label: allLabel ?? "—" }] : []),
    ...cities.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
  ];

  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
      <SelectInput
        label={countryLabel}
        value={countryId}
        placeholder={includeAllOption ? undefined : countryPlaceholder}
        options={countryOptions}
        onChange={(e) => {
          onCountryChange(e.target.value);
          onCityChange(""); // reset city when country changes
        }}
      />
      <SelectInput
        label={cityLabel}
        value={cityId}
        placeholder={includeAllOption ? undefined : cityPlaceholder}
        options={cityOptions}
        disabled={!countryId}
        onChange={(e) => onCityChange(e.target.value)}
      />
    </div>
  );
}
