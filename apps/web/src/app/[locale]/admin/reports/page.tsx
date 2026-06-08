import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, Report } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { AdminActions } from "@/components/admin/AdminActions";
import { fetchAdminReports } from "@/lib/admin";

export default async function AdminReportsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const reports = await fetchAdminReports();

  const columns: Column<Report>[] = [
    { key: "type", header: "type", render: (r) => r.target_type },
    { key: "reason", header: "reason", render: (r) => r.reason },
    { key: "desc", header: "•", render: (r) => <span className="text-muted">{r.description ?? "—"}</span> },
    { key: "status", header: "•", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", render: (r) => <AdminActions kind="report" id={r.id} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("reports")}</h1>
      {/* Admins review conversations ONLY when a related report exists (per spec). */}
      {/* TODO (Phase 2): resolve/reject actions + open related conversation when target_type=conversation. */}
      <AdminTable columns={columns} rows={reports} empty={t("reports")} />
    </div>
  );
}
