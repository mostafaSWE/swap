import { ArrowRight, ChevronDown, Handshake, PackagePlus, Repeat2, Search, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import type { ListingWithRelations, Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { CategoryCard } from "@/components/CategoryCard";
import { ListingGrid } from "@/components/ListingGrid";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/primitives";
import { Reveal, RotatingSwap } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import { fetchFeaturedListings, fetchListings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

const HOME_LISTING_LIMIT = 5;

export default async function HomePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const user = await getCurrentUser();

  const [featured, latest] = await Promise.all([
    fetchFeaturedListings(),
    fetchListings({ sort: "newest", limit: HOME_LISTING_LIMIT }),
  ]);
  const featuredPreview = featured.slice(0, HOME_LISTING_LIMIT);
  const latestPreview = latest.slice(0, HOME_LISTING_LIMIT);

  const addHref = user ? "/new-listing" : "/login";
  const howSteps = [
    {
      icon: <PackagePlus className="h-5 w-5" aria-hidden />,
      title: t("how.step1Title"),
      body: t("how.step1Body"),
    },
    {
      icon: <Search className="h-5 w-5" aria-hidden />,
      title: t("how.step2Title"),
      body: t("how.step2Body"),
    },
    {
      icon: <Handshake className="h-5 w-5" aria-hidden />,
      title: t("how.step3Title"),
      body: t("how.step3Body"),
    },
  ];
  const trustItems = [
    { title: t("trust.item1Title"), body: t("trust.item1Body") },
    { title: t("trust.item2Title"), body: t("trust.item2Body") },
    { title: t("trust.item3Title"), body: t("trust.item3Body") },
  ];

  return (
    <AppShell>
      <Hero isAuthenticated={Boolean(user)} />

      <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-5 sm:space-y-12 sm:px-6 sm:py-10 lg:space-y-16 lg:px-8 lg:py-12">
        <div className="md:hidden">
          <SearchBar />
        </div>

        <Reveal as="section">
          <SectionIntro eyebrow={t("how.eyebrow")} title={t("how.title")} />
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-2 no-scrollbar sm:-mx-6 sm:mt-4 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:pt-0">
            {howSteps.map((step, index) => (
              <HowStep
                key={step.title}
                index={index + 1}
                icon={step.icon}
                title={step.title}
                body={step.body}
              />
            ))}
          </div>
        </Reveal>

        <Reveal as="section">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("categoriesEyebrow")} title={t("categories")} description={t("categoriesDescription")} />
            <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
            {TOP_LEVEL_CATEGORIES.slice(0, 6).map((category) => (
              <CategoryCard key={category.id} category={category} href={`/listings?category=${category.slug}`} />
            ))}
          </div>
        </Reveal>

        <Reveal as="section">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("featuredEyebrow")} title={t("featured")} />
            <Link href="/listings?sort=most_viewed" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 sm:mt-6">
            {featuredPreview.length > 0 ? (
              <HomeListingRail listings={featuredPreview} />
            ) : (
              <EmptyState
                title={t("featuredEmpty")}
                description={t("featuredEmptyHint")}
                action={<HomeAction href={addHref}>{t("cta")}</HomeAction>}
              />
            )}
          </div>
        </Reveal>

        <Reveal as="section">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("latestEyebrow")} title={t("latest")} description={t("latestDescription")} />
            <Link href="/listings" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 sm:mt-6">
            {latestPreview.length > 0 ? (
              <HomeListingRail listings={latestPreview} />
            ) : (
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={<HomeAction href={addHref}>{t("emptyAction")}</HomeAction>}
              />
            )}
          </div>
        </Reveal>

        <Reveal
          as="section"
          className="relative overflow-hidden rounded-[24px] border border-line bg-gradient-to-br from-surface to-night p-5 sm:p-6 md:rounded-[28px] md:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -end-10 -top-10 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:gap-6">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent md:h-12 md:w-12">
                <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink md:mt-5 md:text-3xl">{t("trust.title")}</h2>
            </div>
            <div className="grid gap-2.5 md:hidden">
              {trustItems.map((item) => (
                <TrustDisclosure key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
            <div className="hidden gap-3 md:grid sm:grid-cols-3">
              {trustItems.map((item) => (
                <TrustItem key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal
          as="section"
          className="bg-cta relative overflow-hidden rounded-[24px] border border-accent/25 p-5 sm:p-6 md:rounded-[28px] md:p-8 lg:p-12"
        >
          <div className="pointer-events-none absolute -end-12 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -start-10 opacity-[0.06]">
            <RotatingSwap className="h-56 w-56 text-accent" strokeWidth={1.5} />
          </div>
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("ctaEyebrow")}</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight text-ink md:text-3xl">{t("ctaTitle")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted md:text-base">{t("ctaDescription")}</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 md:flex md:shrink-0 md:flex-row md:gap-3">
              <Link href={addHref} className="btn-primary min-h-12 px-6 shadow-glow">
                {t("cta")}
              </Link>
              <Link href="/listings" className="btn-secondary min-h-12 px-6">
                {t("browseListings")}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </AppShell>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-normal text-ink md:mt-2 md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-muted md:mt-3 md:text-base">{description}</p> : null}
    </div>
  );
}

function HowStep({ index, icon, title, body }: { index: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="group flex min-h-[164px] w-[78vw] max-w-[22rem] shrink-0 snap-center flex-col justify-between rounded-card border border-line bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-elevated sm:w-[20rem] md:min-h-[220px] md:w-auto md:max-w-none md:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent transition-colors group-hover:bg-accent group-hover:text-white md:h-12 md:w-12">
          {icon}
        </span>
        <span className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-bold text-muted">0{index}</span>
      </div>
      <div className="mt-4">
        <h3 className="text-base font-bold text-ink md:text-lg">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted md:line-clamp-none md:leading-7">{body}</p>
      </div>
    </article>
  );
}

function HomeListingRail({ listings }: { listings: ListingWithRelations[] }) {
  return (
    <>
      <div className="-mx-4 overflow-x-auto pb-4 pt-2 no-scrollbar sm:-mx-6 md:hidden">
        <div className="flex snap-x snap-mandatory gap-3 px-4 sm:px-6">
          {listings.map((listing) => (
            <div key={listing.id} className="w-[82vw] max-w-[21.5rem] shrink-0 snap-center min-[420px]:w-[74vw] sm:w-[20rem]">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden md:block">
        <ListingGrid listings={listings} />
      </div>
    </>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Repeat2 className="h-5 w-5 text-accent" aria-hidden />
      <h3 className="mt-4 text-sm font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function TrustDisclosure({ title, body }: { title: string; body: string }) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.03]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Repeat2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <p className="px-4 pb-4 text-sm leading-6 text-muted">{body}</p>
    </details>
  );
}

function HomeAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn-primary min-h-12 px-6">
      {children}
    </Link>
  );
}
