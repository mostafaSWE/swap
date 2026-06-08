import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, Profile } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge, VerifiedBadge } from "@/components/badges";
import { AdminActions } from "@/components/admin/AdminActions";
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
    {
      key: "actions",
      header: "",
      render: (u) => (
        <AdminActions kind="user" id={u.id} state={{ verified: u.is_verified, suspended: u.is_suspended }} />
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("users")}</h1>
      {/* Row actions call the backend admin API (writes admin_actions audit log). */}
      <AdminTable columns={columns} rows={users} empty={t("users")} />
    </div>
  );
}
