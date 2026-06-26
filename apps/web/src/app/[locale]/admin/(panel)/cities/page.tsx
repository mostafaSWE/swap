import { getTranslations, setRequestLocale } from "next-intl/server";
import { COUNTRY_BY_ID } from "@swap/config";
import type { City, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { fetchAdminCities, fetchAdminCountries } from "@/lib/admin";
import { AddCityButton } from "@/components/admin/AddCityButton";

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const cities = await fetchAdminCities();
  const countries = await fetchAdminCountries();

  const columns: Column<City>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "country", header: t("countries"), render: (c) => COUNTRY_BY_ID[c.country_id]?.name_en ?? "—" },
    { key: "status", header: t("status"), render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">{t("cities")}</h1>
        <AddCityButton countries={countries} />
      </div>
      <AdminTable columns={columns} rows={cities} empty={t("cities")} />
    </div>
  );
}
