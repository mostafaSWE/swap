import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { StatusBadge } from "@/components/badges";
import { Link } from "@/i18n/navigation";
import { UrlSearch, UrlTabs, AdminPagination } from "@/components/admin/url-controls";
import { ListingActions } from "@/components/admin/ListingActions";
import { fetchAdminListings, type ListingTab } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { tab?: string; search?: string; page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tcond = await getTranslations("condition");

  const tab = (searchParams.tab ?? "all") as ListingTab;
  const page = Number(searchParams.page) || 1;
  const { rows, total, pageCount } = await fetchAdminListings({ tab, search: searchParams.search, page });

  const tabOptions = [
    { value: "all", label: t("listingsTabs.all") },
    { value: "reported", label: t("listingsTabs.reported") },
    { value: "flagged", label: t("listingsTabs.flagged") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("listings")}</h1>
        <span className="text-sm text-muted">{t("pagination.results", { count: total })}</span>
      </div>

      <div className="flex flex-col gap-3">
        <UrlSearch placeholder={t("listingsTable.searchPlaceholder")} initial={searchParams.search ?? ""} />
        <UrlTabs paramName="tab" value={tab} options={tabOptions} />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          {t("listingsTable.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-line bg-canvas">
              <tr>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("listings")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("listingsTable.owner")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("listingsTable.views")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted">{t("listingsTable.reports")}</th>
                <th className="px-4 py-3 text-start font-semibold text-muted" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/listings/${l.id}`} className="font-semibold text-ink hover:underline">
                      {l.title}
                    </Link>
                    <span className="ms-2 text-xs text-muted">{tcond(l.condition)}</span>
                    {l.is_featured ? (
                      <span className="ms-2 rounded-pill bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        {t("listingsTable.featured")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {l.owner_username ? (
                      <Link href={`/admin/users/${l.owner_id}`} className="text-green hover:underline">
                        @{l.owner_username}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{l.view_count}</td>
                  <td className="px-4 py-3">
                    {l.pending_reports ? (
                      <span className="rounded-pill bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        {l.pending_reports}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ListingActions id={l.id} status={l.status} featured={l.is_featured} />
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
