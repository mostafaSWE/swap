import type { Metadata } from "next";
import { CalendarDays, Eye, Home, MapPin, Pencil, SearchX, Star } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { formatDate, localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ListingGallery } from "@/components/ListingGallery";
import { WantedCard } from "@/components/WantedCard";
import { ListingActions } from "@/components/ListingActions";
import { StickyActionBar } from "@/components/StickyActionBar";
import { ShareButton } from "@/components/ShareButton";
import { SaveButton } from "@/components/SaveButton";
import { SellerCard } from "@/components/SellerCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SafetyNotes } from "@/components/SafetyNotes";
import { ReportDialog } from "@/components/ReportDialog";
import { ListingViewTracker } from "@/components/ListingViewTracker";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
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

  const galleryOverlay = (
    <>
      <span className="inline-flex items-center rounded-pill bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        {tCond(listing.condition)}
      </span>
      {listing.is_featured ? (
        <span className="ms-auto inline-flex items-center gap-1 rounded-pill bg-accent px-2.5 py-1 text-xs font-bold text-white">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
          {t("featured")}
        </span>
      ) : null}
    </>
  );

  return (
    <AppShell hideNav>
      {!isOwner && <ListingViewTracker listingId={listing.id} />}
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-8", !isOwner && "pb-28 md:pb-8")}>
        <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-10">
          {/* Media — sticky alongside the scrolling info column on desktop. */}
          <div className="md:sticky md:top-20 md:self-start">
            <ListingGallery images={listing.images} overlay={galleryOverlay} />
          </div>

          {/* Info column. */}
          <div className="mt-5 space-y-5 md:mt-0">
            {/* Header: title + quick icon actions + metadata chips. */}
            <header className="space-y-3">
              <div className="flex items-start gap-3">
                <h1 className="flex-1 text-2xl font-bold leading-tight text-ink md:text-[1.75rem]">
                  {listing.title}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  <ShareButton
                    variant="icon"
                    title={listing.title}
                    text={listing.wanted_exchange || undefined}
                  />
                  {isOwner ? null : (
                    <SaveButton
                      variant="icon"
                      listingId={listing.id}
                      initialSaved={initialSaved}
                      className="hidden md:flex"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="chip">
                  <CategoryIcon icon={listing.category?.icon ?? "other"} className="h-4 w-4 text-accent" />
                  {localizedName(listing.category, activeLocale)}
                </span>
                <span className="chip">{tCond(listing.condition)}</span>
                <span className="chip">
                  <MapPin className="h-4 w-4 text-muted" aria-hidden />
                  {localizedName(listing.city, activeLocale)} · {localizedName(listing.country, activeLocale)}
                </span>
                <span className="inline-flex items-center gap-1 text-muted">
                  <Eye className="h-4 w-4" aria-hidden />
                  {t("views", { count: listing.view_count })}
                </span>
                <span className="inline-flex items-center gap-1 text-muted">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {t("postedOn", { date: formatDate(listing.created_at, activeLocale) })}
                </span>
              </div>
            </header>

            {/* The focal point: what the owner wants in exchange. */}
            <WantedCard wanted={listing.wanted_exchange} categoryIcon={listing.category?.icon ?? "other"} />

            {/* Primary actions — inline on desktop; the sticky bar handles mobile. */}
            {isOwner ? (
              <Link href={`/listings/${listing.id}/edit`} className="btn-primary w-full">
                <Pencil className="h-5 w-5" aria-hidden />
                {t("editListing")}
              </Link>
            ) : (
              <div className="hidden md:block">
                <ListingActions ownerId={listing.owner_id} listingId={listing.id} />
              </div>
            )}

            {/* Who you'd be swapping with. */}
            <SellerCard
              owner={listing.owner}
              locale={activeLocale}
              isOwner={isOwner}
              initialFollowing={initialFollowing}
            />

            {listing.description ? (
              <section className="space-y-1.5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t("description")}</h2>
                <p className="whitespace-pre-wrap text-[0.9375rem] leading-7 text-ink/90">{listing.description}</p>
              </section>
            ) : null}

            <SafetyNotes />

            <div className="flex justify-center pt-1">
              <ReportDialog targetType="listing" targetId={listing.id} />
            </div>
          </div>
        </div>
      </div>

      {isOwner ? null : (
        <StickyActionBar ownerId={listing.owner_id} listingId={listing.id} initialSaved={initialSaved} />
      )}
    </AppShell>
  );
}

async function ListingUnavailable() {
  const t = await getTranslations("notFound");

  return (
    <AppShell>
      <section className="mx-auto flex min-h-[62vh] w-full max-w-[960px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <SearchX className="h-8 w-8" aria-hidden />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-accent">{t("eyebrow")}</p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{t("title")}</h1>
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
