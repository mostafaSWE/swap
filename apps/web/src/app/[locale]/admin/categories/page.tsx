import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORIES } from "@swap/config";
import type { Category, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";

export default async function AdminCategoriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const columns: Column<Category>[] = [
    { key: "ar", header: "AR", render: (c) => c.name_ar },
    { key: "en", header: "EN", render: (c) => c.name_en },
    { key: "slug", header: "slug", render: (c) => <span className="text-muted">{c.slug}</span> },
    { key: "status", header: "•", render: (c) => <StatusBadge status={c.is_active ? "active" : "removed"} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("categories")}</h1>
      {/* Source: @swap/config (mirrors DB seed). TODO (Phase 2): CRUD against the DB. */}
      <AdminTable columns={columns} rows={CATEGORIES} empty={t("categories")} />
    </div>
  );
}
