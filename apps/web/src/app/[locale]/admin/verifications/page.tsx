import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, VerificationRequest } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { AdminActions } from "@/components/admin/AdminActions";
import { fetchAdminVerifications } from "@/lib/admin";

export default async function AdminVerificationsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const requests = await fetchAdminVerifications();

  const columns: Column<VerificationRequest>[] = [
    { key: "type", header: "type", render: (r) => r.type },
    { key: "notes", header: "•", render: (r) => <span className="text-muted">{r.notes ?? "—"}</span> },
    { key: "status", header: "•", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", render: (r) => <AdminActions kind="verification" id={r.id} /> },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("verifications")}</h1>
      {/* Manual verification workflow only (no payment in MVP). */}
      {/* TODO (Phase 2): approve/reject → set profiles.is_verified or listings.is_verified_item, log admin_actions, add payment. */}
      <AdminTable columns={columns} rows={requests} empty={t("verifications")} />
    </div>
  );
}
