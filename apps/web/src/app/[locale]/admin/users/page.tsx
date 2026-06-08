import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, Profile } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge, VerifiedBadge } from "@/components/badges";
import { fetchAdminUsers } from "@/lib/admin";

export default async function AdminUsersPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tl = await getTranslations("listing");
  const users = await fetchAdminUsers();

  const columns: Column<Profile>[] = [
    { key: "username", header: "@", render: (u) => <span className="font-semibold">@{u.username}</span> },
    { key: "name", header: t("users"), render: (u) => u.full_name || "—" },
    {
      key: "verified",
      header: tl("verifiedAccount"),
      render: (u) => (u.is_verified ? <VerifiedBadge label={tl("verifiedAccount")} /> : "—"),
    },
    {
      key: "status",
      header: "•",
      render: (u) => <StatusBadge status={u.is_suspended ? "removed" : "active"} />,
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("users")}</h1>
      {/* TODO (Phase 2): row actions — verify, suspend, soft-delete (writes admin_actions). */}
      <AdminTable columns={columns} rows={users} empty={t("users")} />
    </div>
  );
}
