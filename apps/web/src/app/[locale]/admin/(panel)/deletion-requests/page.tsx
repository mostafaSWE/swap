import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatDate } from "@swap/ui";
import type { Locale } from "@swap/types";
import { StatusBadge } from "@/components/badges";
import { Link } from "@/i18n/navigation";
import { AdminPagination } from "@/components/admin/url-controls";
import { fetchAdminDeletionRequests } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * The queue behind the public /account/delete form (migration 0022). People who
 * can no longer sign in file a request here instead of deleting themselves, and
 * the published policy promises we action it within 30 days — which is only true
 * if somebody can actually SEE the queue. Read-only on purpose: actioning a
 * request means deleting the account through the user detail page, so there is no
 * destructive control on this list.
 */
export default async function AdminDeletionRequestsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const td = await getTranslations("admin.deletionRequests");

  const page = Number(searchParams.page) || 1;
  const { rows, total, pageCount } = await fetchAdminDeletionRequests({ page });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{td("title")}</h1>
        <span className="text-sm text-muted">{t("pagination.results", { count: total })}</span>
      </div>

      <p className="text-sm leading-6 text-muted">{td("hint")}</p>

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
          {td("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-line bg-canvas">
              <tr>
                <th className="px-4 py-3 text-start font-semibold text-muted">{td("email")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{td("username")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{td("reason")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{td("status")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{td("when")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <a href={`mailto:${r.email}`} className="text-green hover:underline">
                      {r.email}
                    </a>
                  </td>
                  {/* The API resolves the address to a profile when it can, so the
                      admin can jump straight to the account this request is about. */}
                  <td className="px-4 py-3">
                    {r.user_id ? (
                      <Link href={`/admin/users/${r.user_id}`} className="text-green hover:underline">
                        {r.username ? `@${r.username}` : r.user_id}
                      </Link>
                    ) : (
                      <span className="text-ink">{r.username ? `@${r.username}` : "—"}</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted">
                    <span className="line-clamp-2 whitespace-pre-wrap">{r.reason ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} label={td(`statuses.${r.status}`)} />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.created_at, locale)}</td>
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
