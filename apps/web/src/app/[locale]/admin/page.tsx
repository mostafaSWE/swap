import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { fetchAdminMetrics } from "@/lib/admin";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="text-2xl font-extrabold text-navy">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export default async function AdminDashboardPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const metrics = await fetchAdminMetrics();

  const cards = [
    { label: t("metrics.totalUsers"), value: metrics.totalUsers },
    { label: t("metrics.verifiedUsers"), value: metrics.verifiedUsers },
    { label: t("metrics.activeListings"), value: metrics.activeListings },
    { label: t("metrics.hiddenListings"), value: metrics.hiddenListings },
    { label: t("metrics.pendingReports"), value: metrics.pendingReports },
    { label: t("metrics.totalConversations"), value: metrics.totalConversations },
    { label: t("metrics.totalMessages"), value: metrics.totalMessages },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("dashboard")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <MetricCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
    </div>
  );
}
