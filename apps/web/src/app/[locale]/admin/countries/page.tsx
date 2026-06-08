import { getTranslations, setRequestLocale } from "next-intl/server";
import { COUNTRIES } from "@swap/config";
import type { Country, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";

export default async function AdminCountriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const columns: Column<Country>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "iso", header: "ISO", render: (c) => c.iso_code },
    { key: "phone", header: "☎", render: (c) => c.phone_code },
    { key: "currency", header: "¤", render: (c) => c.currency_code },
    { key: "status", header: "•", render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("countries")}</h1>
      {/* Source: @swap/config (mirrors DB seed). TODO (Phase 2): CRUD against the DB. */}
      <AdminTable columns={columns} rows={COUNTRIES} empty={t("countries")} />
    </div>
  );
}
