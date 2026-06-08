import { Bookmark } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/primitives";

export default async function SavedPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const tn = await getTranslations("nav");
  const te = await getTranslations("empty");

  // TODO (Phase 2): list the user's saved_listings (saveListing/unsaveListing
  // already exist in @swap/api). Skeleton for now.
  return (
    <AppShell>
      <div className="px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-ink">{tn("saved")}</h1>
        <EmptyState icon={<Bookmark className="h-10 w-10" />} title={te("generic")} />
      </div>
    </AppShell>
  );
}
