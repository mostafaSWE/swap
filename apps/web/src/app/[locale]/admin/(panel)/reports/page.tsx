import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatDate } from "@swap/ui";
import type { Locale } from "@swap/types";
import { StatusBadge } from "@/components/badges";
import { Link } from "@/i18n/navigation";
import { UrlTabs, AdminPagination } from "@/components/admin/url-controls";
import { ReportActions } from "@/components/admin/ReportActions";
import { fetchAdminReports, type ReportSort } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function severityChip(severity: number, labels: { high: string; medium: string; low: string }) {
  const tier = severity >= 3 ? "high" : severity === 2 ? "medium" : "low";
  const style =
    tier === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
      : tier === "medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-elevated text-muted";
  return <span className={cn("rounded-pill px-2 py-0.5 text-[11px] font-bold", style)}>{labels[tier]}</span>;
}

export default async function AdminReportsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { sort?: string; page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tr = await getTranslations("report");

  const sort = (searchParams.sort ?? "severity") as ReportSort;
  const page = Number(searchParams.page) || 1;
  const { rows, total, pageCount } = await fetchAdminReports({ sort, page });

  const sevLabels = {
    high: t("reportsTable.severity.high"),
    medium: t("reportsTable.severity.medium"),
    low: t("reportsTable.severity.low"),
  };
  const sortOptions = [
    { value: "severity", label: t("reportsTable.sortSeverity") },
    { value: "newest", label: t("reportsTable.sortNewest") },
  ];
  const reasonLabel = (reason: string) => {
    const known = ["spam", "inappropriate", "scam", "other"];
    if (known.includes(reason)) return tr(`reasons.${reason}`);
    // Deal-closing disputes use a literal report reason; keep legacy rows readable.
    if (reason === "Exchange dispute" || reason === "Swap dispute") return tr("reasons.swap_dispute");
    return reason;
  };
  const targetHref = (type: string, id: string) =>
    type === "listing" ? `/listings/${id}` : type === "user" ? `/admin/users/${id}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("reports")}</h1>
        <span className="text-sm text-muted">{t("pagination.results", { count: total })}</span>
      </div>

      <UrlTabs paramName="sort" value={sort} options={sortOptions} />

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("reportsTable.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const href = targetHref(r.target_type, r.target_id);
            return (
              <li key={r.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {severityChip(r.severity, sevLabels)}
                  <span className="font-semibold text-ink">{reasonLabel(r.reason)}</span>
                  <StatusBadge status={r.status} />
                  <span className="ms-auto text-xs text-muted">{formatDate(r.created_at, locale)}</span>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                  <p className="text-muted">
                    {t("reportsTable.reporter")}:{" "}
                    <span className="text-ink">{r.reporter_username ? `@${r.reporter_username}` : "—"}</span>
                  </p>
                  <p className="text-muted">
                    {t("reportsTable.target")}:{" "}
                    {href ? (
                      <Link href={href} className="text-green hover:underline">
                        {r.target_label ?? r.target_type}
                      </Link>
                    ) : (
                      <span className="text-ink">{r.target_label ?? r.target_type}</span>
                    )}
                  </p>
                </div>

                {r.description ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-card bg-night px-3 py-2 text-sm text-muted">
                    {r.description}
                  </p>
                ) : null}

                <div className="mt-3">
                  <ReportActions id={r.id} targetType={r.target_type} targetId={r.target_id} status={r.status} />
                </div>
              </li>
            );
          })}
        </ul>
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
