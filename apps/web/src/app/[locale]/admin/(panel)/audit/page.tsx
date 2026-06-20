import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatDate } from "@swap/ui";
import type { Locale } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { UrlSearch, AdminPagination } from "@/components/admin/url-controls";
import { fetchAdminActions } from "@/lib/admin";

export const dynamic = "force-dynamic";

const KNOWN_ACTIONS = ["update_user", "update_listing", "update_report", "note", "message", "request_edits"];

export default async function AdminAuditPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { search?: string; page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const page = Number(searchParams.page) || 1;
  const { rows, total, pageCount } = await fetchAdminActions({ search: searchParams.search, page });

  const targetHref = (type: string, id: string) =>
    type === "user" ? `/admin/users/${id}` : type === "listing" ? `/listings/${id}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("audit")}</h1>
        <span className="text-sm text-muted">{t("pagination.results", { count: total })}</span>
      </div>

      <UrlSearch placeholder={t("auditTable.searchPlaceholder")} initial={searchParams.search ?? ""} />

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          {t("auditTable.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-line bg-canvas">
              <tr>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("auditTable.admin")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("auditTable.action")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("auditTable.target")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("auditTable.notes")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("auditTable.when")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const href = targetHref(a.target_type, a.target_id);
                return (
                  <tr key={a.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3 text-ink">{a.admin_username ? `@${a.admin_username}` : "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {KNOWN_ACTIONS.includes(a.action_type) ? t(`actionType.${a.action_type}`) : a.action_type}
                    </td>
                    <td className="px-4 py-3">
                      {href ? (
                        <Link href={href} className="text-green hover:underline">
                          {a.target_type}
                        </Link>
                      ) : (
                        <span className="text-muted">{a.target_type}</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-ink-muted">
                      <span className="line-clamp-2 whitespace-pre-wrap">{a.notes ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(a.created_at, locale)}</td>
                  </tr>
                );
              })}
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
