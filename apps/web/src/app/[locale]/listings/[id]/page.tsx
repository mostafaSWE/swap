import type { Metadata } from "next";
import { Eye, Home, MapPin, Pencil, SearchX } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ListingGallery } from "@/components/ListingGallery";
import { SwapPair } from "@/components/SwapPair";
import { ListingActions } from "@/components/ListingActions";
import { ShareButton } from "@/components/ShareButton";
import { SaveButton } from "@/components/SaveButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { RatingBadge, SwapCountBadge } from "@/components/badges";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { ReportDialog } from "@/components/ReportDialog";
import { Link } from "@/i18n/navigation";
import { fetchListing } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { fetchIsSaved } from "@/lib/saved";
import { fetchIsFollowing } from "@/lib/social";

export async function generateMetadata({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string };
}): Promise<Metadata> {
  const listing = await fetchListing(id);
  if (!listing) {
    const t = await getTranslations({ locale, namespace: "notFound" });
    return { title: t("title") };
  }
  const description = (listing.description || listing.wanted_exchange || "").slice(0, 160);
  const cover = listing.images?.[0]?.image_url;
  const images = cover ? [cover] : undefined;
  return {
    title: listing.title,
    description,
    openGraph: { title: listing.title, description, images, type: "website" },
    twitter: { card: images ? "summary_large_image" : "summary", title: listing.title, description, images },
  };
}

export default async function ListingDetailsPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string };
}) {
  setRequestLocale(locale);
  const listing = await fetchListing(id);
  if (!listing) return <ListingUnavailable />;

  const activeLocale = (await getLocale()) as Locale;
  const t = await getTranslations("listing");
  const tCond = await getTranslations("condition");

  const user = await getCurrentUser();
  const isOwner = user?.id === listing.owner_id;
  const [initialSaved, initialFollowing] = user
    ? await Promise.all([
        fetchIsSaved(user.id, listing.id),
        isOwner ? Promise.resolve(false) : fetchIsFollowing(user.id, listing.owner_id),
      ])
    : [false, false];

  return (
    <AppShell hideNav>
      <div className="px-4 py-4 pb-10 md:grid md:grid-cols-2 md:gap-8 md:py-8">
        <div className="md:sticky md:top-20 md:self-start">
          <ListingGallery images={listing.images} />
        </div>

        <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-ink">{listing.title}</h1>
            <span className="chip shrink-0">{tCond(listing.condition)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden />
              {localizedName(listing.city, activeLocale)} · {localizedName(listing.country, activeLocale)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Eye className="h-4 w-4" aria-hidden />
              {listing.view_count}
            </span>
          </div>
        </div>

        {/* Owner */}
        <Link
          href={`/users/${listing.owner.username}`}
          className="card flex items-center gap-3 p-3"
        >
          <ProfileAvatar src={listing.owner.avatar_url} name={listing.owner.full_name} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{listing.owner.full_name}</span>
              <SwapCountBadge count={listing.owner.completed_swaps_count} label={t("completedSwaps")} />
              <RatingBadge
                rating={listing.owner.rating}
                count={listing.owner.ratings_count}
                ariaLabel={t("ratingAria", {
                  rating: Number(listing.owner.rating ?? 0).toFixed(1),
                  count: listing.owner.ratings_count,
                })}
              />
            </div>
            <span className="text-sm text-muted">@{listing.owner.username}</span>
          </div>
        </Link>

        <section>
          <h2 className="mb-1 font-bold text-ink">{t("description")}</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{listing.description}</p>
        </section>

        <section className="rounded-card border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 font-bold text-ink">{t("wantedExchange")}</h2>
          <SwapPair listing={listing} size="lg" />
          {listing.wanted_exchange ? (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink/80">{listing.wanted_exchange}</p>
          ) : null}
        </section>

        <SafetyDisclaimer />

        {isOwner ? (
          <Link href={`/listings/${listing.id}/edit`} className="btn-primary w-full">
            <Pencil className="h-5 w-5" aria-hidden />
            {t("editListing")}
          </Link>
        ) : (
          <ListingActions
            ownerId={listing.owner_id}
            listingId={listing.id}
            initialFollowing={initialFollowing}
          />
        )}

        <ShareButton title={listing.title} text={listing.wanted_exchange || undefined} />
        <SaveButton listingId={listing.id} initialSaved={initialSaved} />

        <div className="flex justify-center pt-2">
          <ReportDialog targetType="listing" targetId={listing.id} />
        </div>
        </div>
      </div>
    </AppShell>
  );
}

async function ListingUnavailable() {
  const t = await getTranslations("notFound");

  return (
    <AppShell>
      <section className="mx-auto flex min-h-[62vh] w-full max-w-[960px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-light text-green-dark">
          <SearchX className="h-8 w-8" aria-hidden />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-green-dark">{t("eyebrow")}</p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-navy md:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-pretty text-base leading-7 text-muted">{t("description")}</p>
        <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/listings" className="btn-primary min-h-12 flex-1">
            {t("browse")}
          </Link>
          <Link href="/" className="btn-secondary min-h-12 flex-1">
            <Home className="h-4 w-4" aria-hidden />
            {t("home")}
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
