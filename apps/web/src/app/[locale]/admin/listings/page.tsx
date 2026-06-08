import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Listing, Locale } from "@swap/types";
import { AdminTable, type Column } from "@/components/AdminTable";
import { StatusBadge } from "@/components/badges";
import { AdminActions } from "@/components/admin/AdminActions";
import { fetchAdminListings } from "@/lib/admin";

export default async function AdminListingsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const listings = await fetchAdminListings();

  const columns: Column<Listing>[] = [
    { key: "title", header: t("listings"), render: (l) => <span className="font-semibold">{l.title}</span> },
    { key: "condition", header: "•", render: (l) => l.condition },
    { key: "views", header: "👁", render: (l) => l.view_count },
    { key: "status", header: "•", render: (l) => <StatusBadge status={l.status} /> },
    {
      key: "actions",
      header: "",
      render: (l) => <AdminActions kind="listing" id={l.id} state={{ hidden: l.status === "hidden" }} />,
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("listings")}</h1>
      {/* Row actions (hide/show, verify item) call the backend admin API. */}
      <AdminTable columns={columns} rows={listings} empty={t("listings")} />
    </div>
  );
}
