import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CITY_BY_ID } from "@swap/config";
import { formatDate, localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { ProposalStatusBadge, StatusBadge } from "@/components/badges";
import { Link } from "@/i18n/navigation";
import { UserActions } from "@/components/admin/UserActions";
import { fetchAdminUserDetail, effectiveSuspended } from "@/lib/admin";

export const dynamic = "force-dynamic";

const KNOWN_ACTIONS = ["update_user", "update_listing", "update_report", "note", "message", "request_edits"];

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count?: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold text-ink">
        {title}
        {typeof count === "number" ? <span className="ms-2 text-muted">({count})</span> : null}
      </h2>
      {count === 0 ? <p className="py-6 text-center text-sm text-muted">{empty}</p> : children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params: { locale, id },
  searchParams,
}: {
  params: { locale: Locale; id: string };
  searchParams: { tab?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tp = await getTranslations("proposal");
  const detail = await fetchAdminUserDetail(id);
  if (!detail) notFound();
  const { profile: p, listings, reports, proposals, ratings, actions } = detail;
  const suspended = effectiveSuspended(p);

  const statusBadge = p.is_banned ? (
    <StatusBadge status="removed" label={t("userStatus.banned")} />
  ) : suspended ? (
    <StatusBadge status="pending" label={t("userStatus.suspended")} />
  ) : p.is_admin ? (
    <StatusBadge status="reviewed" label={t("userStatus.admin")} />
  ) : (
    <StatusBadge status="active" label={t("userStatus.active")} />
  );

  const city = p.city_id ? CITY_BY_ID[p.city_id] : undefined;
  const cityName = city ? localizedName(city, locale) : null;

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-green hover:underline">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t("userDetail.back")}
      </Link>

      {/* Header + actions */}
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink">{p.full_name || p.username}</h1>
              {statusBadge}
            </div>
            <p className="text-sm text-muted">@{p.username}</p>
          </div>
          <UserActions id={p.id} suspended={p.is_suspended} banned={p.is_banned} variant="detail" />
        </div>

        {(suspended || p.is_banned) && p.suspension_reason ? (
          <p className="mt-3 rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">{p.suspension_reason}</p>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact label={t("userDetail.email")} value={p.email} />
          <Fact label={t("userDetail.phone")} value={p.phone} />
          <Fact label={t("userDetail.city")} value={cityName} />
          <Fact label={t("userDetail.joined")} value={formatDate(p.created_at, locale)} />
          <Fact label={t("userDetail.completedSwaps")} value={p.completed_swaps_count} />
          <Fact
            label={t("userDetail.rating")}
            value={p.rating ? `${p.rating} (${p.ratings_count})` : null}
          />
          <Fact label={t("userDetail.listingsCount")} value={p.listings_count} />
        </dl>
        {p.bio ? <p className="mt-3 text-sm text-muted">{p.bio}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("userDetail.tabListings")} count={listings.length} empty={t("userDetail.noListings")}>
          <ul className="divide-y divide-line">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/listings/${l.id}`} className="truncate text-ink hover:underline">
                  {l.title}
                </Link>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("userDetail.tabSwaps")} count={proposals.length} empty={t("userDetail.noSwaps")}>
          <ul className="divide-y divide-line">
            {proposals.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-muted">{formatDate(s.updated_at, locale)}</span>
                <ProposalStatusBadge status={s.status} label={tp(`status.${s.status}`)} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("userDetail.tabReports")} count={reports.length} empty={t("userDetail.noReports")}>
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-ink">{r.reason}</span>
                <span className="flex items-center gap-2 text-muted">
                  <span>{r.target_type}</span>
                  <StatusBadge status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("userDetail.ratingsTitle")} count={ratings.length} empty={t("userDetail.noRatings")}>
          <ul className="divide-y divide-line">
            {ratings.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400" aria-label={`${r.stars}/5`}>
                    {"★".repeat(r.stars)}
                    <span className="text-faint">{"★".repeat(5 - r.stars)}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {r.rater_username ? t("userDetail.by", { name: r.rater_username }) : null}
                  </span>
                </div>
                {r.comment ? <p className="mt-1 text-muted">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        </Section>

        <section className="rounded-card border border-line bg-surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-ink">
            {t("userDetail.tabActivity")}
            <span className="ms-2 text-muted">({actions.length})</span>
          </h2>
          {actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("userDetail.noActivity")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {actions.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">
                      {KNOWN_ACTIONS.includes(a.action_type) ? t(`actionType.${a.action_type}`) : a.action_type}
                    </span>
                    <span className="text-xs text-muted">
                      {a.admin_username ? `@${a.admin_username}` : "—"} · {formatDate(a.created_at, locale)}
                    </span>
                  </div>
                  {a.notes ? <p className="mt-0.5 whitespace-pre-wrap text-muted">{a.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
