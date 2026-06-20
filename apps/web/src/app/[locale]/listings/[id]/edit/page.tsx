import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { redirect } from "@/i18n/navigation";
import { fetchListing } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { EditListingForm } from "./EditListingForm";

export default async function EditListingPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string };
}) {
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const listing = await fetchListing(id);
  if (!listing) notFound();
  // Owner-only (also enforced server-side on every mutation).
  if (listing.owner_id !== user!.id) redirect({ href: `/listings/${id}`, locale });
  // Only active/paused listings are editable — never re-activate a completed (swapped)
  // or removed listing through the edit form.
  if (listing.status !== "active" && listing.status !== "hidden") {
    redirect({ href: `/listings/${id}`, locale });
  }

  return (
    <AppShell hideNav>
      <EditListingForm listing={listing} />
    </AppShell>
  );
}
