import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatDate } from "@swap/ui";
import type { Locale, Profile } from "@swap/types";
import { StatusBadge } from "@/components/badges";
import { Link } from "@/i18n/navigation";
import { UrlSearch, UrlTabs, AdminPagination } from "@/components/admin/url-controls";
import { UserActions } from "@/components/admin/UserActions";
import { fetchAdminUsers, effectiveSuspended, type UserStatusFilter } from "@/lib/admin";

export const dynamic = "force-dynamic";

function UserStatusBadge({ u, labels }: { u: Profile; labels: Record<string, string> }) {
  if (u.is_banned) return <StatusBadge status="removed" label={labels.banned} />;
  if (effectiveSuspended(u)) return <StatusBadge status="pending" label={labels.suspended} />;
  if (u.is_admin) return <StatusBadge status="reviewed" label={labels.admin} />;
  return <StatusBadge status="active" label={labels.active} />;
}

export default async function AdminUsersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { search?: string; status?: string; page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tl = await getTranslations("listing");

  const status = (searchParams.status ?? "all") as UserStatusFilter;
  const page = Number(searchParams.page) || 1;
  const { rows, total, pageCount } = await fetchAdminUsers({ search: searchParams.search, status, page });

  const statusLabels = {
    active: t("userStatus.active"),
    suspended: t("userStatus.suspended"),
    banned: t("userStatus.banned"),
    admin: t("userStatus.admin"),
  };
  const statusOptions = [
    { value: "all", label: t("userStatus.all") },
    { value: "active", label: statusLabels.active },
    { value: "suspended", label: statusLabels.suspended },
    { value: "banned", label: statusLabels.banned },
    { value: "admin", label: statusLabels.admin },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("users")}</h1>
        <span className="text-sm text-muted">{t("pagination.results", { count: total })}</span>
      </div>

      <div className="flex flex-col gap-3">
        <UrlSearch placeholder={t("usersTable.searchPlaceholder")} initial={searchParams.search ?? ""} />
        <UrlTabs paramName="status" value={status} options={statusOptions} />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          {t("usersTable.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-line bg-canvas">
              <tr>
                <th className="px-4 py-3 text-start font-semibold text-muted">@</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("users")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("usersTable.status")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{tl("completedSwaps")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("usersTable.joined")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-semibold text-green hover:underline">
                      @{u.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{u.full_name || "—"}</td>
                  <td className="px-4 py-3">
                    <UserStatusBadge u={u} labels={statusLabels} />
                  </td>
                  <td className="px-4 py-3 text-ink">{u.completed_swaps_count || "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.created_at, locale)}</td>
                  <td className="px-4 py-3">
                    <UserActions id={u.id} suspended={u.is_suspended} banned={u.is_banned} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        labels={{
          prev: t("pagination.prev"),
          next: t("pagination.next"),
          pageOf: t("pagination.pageOf", { page, count: pageCount }),
        }}
      />
    </div>
  );
}
