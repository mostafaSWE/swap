import { getTranslations, setRequestLocale } from "next-intl/server";
import { COUNTRY_BY_ID } from "@swap/config";
import type { City, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { fetchAdminCities } from "@/lib/admin";

export default async function AdminCitiesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const cities = await fetchAdminCities();

  const columns: Column<City>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "country", header: t("countries"), render: (c) => COUNTRY_BY_ID[c.country_id]?.name_en ?? "—" },
    { key: "status", header: "•", render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("cities")}</h1>
      {/* Loaded from the DB. Country name resolved via @swap/config (shared UUIDs). */}
      <AdminTable columns={columns} rows={cities} empty={t("cities")} />
    </div>
  );
}
