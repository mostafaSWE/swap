import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { NewListingForm } from "./NewListingForm";

export default async function NewListingPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  // Guard only when Supabase is configured; otherwise allow previewing the form.
  if (isSupabaseConfigured()) await requireUser(locale);

  // The wizard renders its own header + progress + container.
  return (
    <AppShell hideNav>
      <NewListingForm />
    </AppShell>
  );
}
