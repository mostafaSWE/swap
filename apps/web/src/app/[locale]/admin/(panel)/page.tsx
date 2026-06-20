import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { fetchAdminAnalytics, type NamedCount } from "@/lib/admin-analytics";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import {
  CategoryDonut,
  CityBarChart,
  DailyLineChart,
  ProposalFunnel,
  Sparkline,
  WeeklyBarChart,
} from "@/components/admin/charts";

export const dynamic = "force-dynamic";

function MetricCard({
  label,
  value,
  spark,
  color,
}: {
  label: string;
  value: number;
  spark: number[];
  color: string;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="text-2xl font-extrabold text-navy">{value.toLocaleString()}</div>
      <div className="mb-2 text-sm text-muted">{label}</div>
      <Sparkline data={spark} color={color} />
    </div>
  );
}

function ChartCard({
  title,
  children,
  full,
}: {
  title: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "rounded-card border border-line bg-white p-4 lg:col-span-2" : "rounded-card border border-line bg-white p-4"}>
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function localize(rows: NamedCount[], locale: Locale): { name: string; count: number }[] {
  return rows.map((r) => ({ name: locale === "ar" ? r.name_ar : r.name_en, count: r.count }));
}

export default async function AdminDashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { from?: string; to?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const a = await fetchAdminAnalytics({ from: searchParams.from, to: searchParams.to });

  const cards = [
    { label: t("metrics.totalUsers"), value: a.cards.totalUsers, spark: a.sparklines.users, color: "#18B66A" },
    { label: t("metrics.activeListings"), value: a.cards.activeListings, spark: a.sparklines.listings, color: "#0B1324" },
    { label: t("metrics.completedSwaps"), value: a.cards.completedSwaps, spark: a.sparklines.completions, color: "#3B82F6" },
    { label: t("metrics.openProposals"), value: a.cards.openProposals, spark: a.sparklines.proposals, color: "#F59E0B" },
    { label: t("metrics.pendingReports"), value: a.cards.pendingReports, spark: a.sparklines.reports, color: "#EF4444" },
  ];

  const cat = localize(a.categoryBreakdown, locale);
  const city = localize(a.cityBreakdown, locale);
  const hasDaily = a.daily.some((d) => d.users || d.listings);
  const emptyNote = <p className="py-10 text-center text-sm text-muted">{t("analytics.charts.empty")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-ink">{t("dashboard")}</h1>
        <DateRangePicker
          from={a.range.from}
          to={a.range.to}
          labels={{
            from: t("analytics.range.from"),
            to: t("analytics.range.to"),
            apply: t("analytics.range.apply"),
            last7: t("analytics.range.last7"),
            last30: t("analytics.range.last30"),
            last90: t("analytics.range.last90"),
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <MetricCard key={c.label} label={c.label} value={c.value} spark={c.spark} color={c.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t("analytics.charts.dailyTitle")} full>
          {hasDaily ? (
            <DailyLineChart
              data={a.daily}
              usersLabel={t("analytics.charts.users")}
              listingsLabel={t("analytics.charts.listings")}
            />
          ) : (
            emptyNote
          )}
        </ChartCard>

        <ChartCard title={t("analytics.charts.completionsTitle")}>
          {a.completionsByWeek.length ? (
            <WeeklyBarChart data={a.completionsByWeek} label={t("analytics.charts.completions")} />
          ) : (
            emptyNote
          )}
        </ChartCard>

        <ChartCard title={t("analytics.charts.funnelTitle")}>
          <ProposalFunnel
            data={a.funnel}
            labels={{
              proposals: t("analytics.funnel.proposals"),
              agreed: t("analytics.funnel.agreed"),
              completed: t("analytics.funnel.completed"),
            }}
          />
        </ChartCard>

        <ChartCard title={t("analytics.charts.categoryTitle")}>
          {cat.length ? <CategoryDonut data={cat} /> : emptyNote}
        </ChartCard>

        <ChartCard title={t("analytics.charts.cityTitle")}>
          {city.length ? <CityBarChart data={city} /> : emptyNote}
        </ChartCard>
      </div>
    </div>
  );
}
