import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Country, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { fetchAdminCountries } from "@/lib/admin";
import { AddCountryButton } from "@/components/admin/AddCountryButton";

export const dynamic = "force-dynamic";

export default async function AdminCountriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const countries = await fetchAdminCountries();

  const columns: Column<Country>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "iso", header: "ISO", render: (c) => c.iso_code },
    { key: "phone", header: "☎", render: (c) => c.phone_code },
    { key: "currency", header: "¤", render: (c) => c.currency_code },
    { key: "status", header: t("status"), render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">{t("countries")}</h1>
        <AddCountryButton />
      </div>
      <AdminTable columns={columns} rows={countries} empty={t("countries")} />
    </div>
  );
}
