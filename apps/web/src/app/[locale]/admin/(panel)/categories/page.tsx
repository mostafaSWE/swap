import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Category, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { fetchAdminCategories } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const categories = await fetchAdminCategories();

  const columns: Column<Category>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "slug", header: "slug", render: (c) => <span className="text-muted">{c.slug}</span> },
    { key: "status", header: t("status"), render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("categories")}</h1>
      {/* Loaded from the DB. TODO (Phase 2): inline create/edit via the admin catalog API. */}
      <AdminTable columns={columns} rows={categories} empty={t("categories")} />
    </div>
  );
}
