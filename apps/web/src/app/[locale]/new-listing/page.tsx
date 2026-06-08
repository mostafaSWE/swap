import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { NewListingForm } from "./NewListingForm";

export default async function NewListingPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  // Guard only when Supabase is configured; otherwise allow previewing the form.
  if (isSupabaseConfigured()) await requireUser(locale);
  const t = await getTranslations("newListing");

  return (
    <AppShell hideNav>
      <div className="px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-ink">{t("title")}</h1>
        <NewListingForm />
      </div>
    </AppShell>
  );
}
