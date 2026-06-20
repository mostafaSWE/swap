import { ArrowRight, Handshake, PackagePlus, Repeat2, Search, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { CategoryCard } from "@/components/CategoryCard";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { Link } from "@/i18n/navigation";
import { fetchFeaturedListings, fetchListings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const user = await getCurrentUser();

  const [featured, latest] = await Promise.all([
    fetchFeaturedListings(),
    fetchListings({ sort: "newest", limit: 10 }),
  ]);

  const sample = featured[0] ?? latest[0];
  const addHref = user ? "/new-listing" : "/login";

  return (
    <AppShell>
      <Hero sample={sample} isAuthenticated={Boolean(user)} />

      <div className="mx-auto w-full max-w-[1440px] space-y-16 px-4 py-10 sm:px-6 lg:px-8">
        <div className="md:hidden">
          <SearchBar />
        </div>

        <section>
          <SectionIntro eyebrow={t("how.eyebrow")} title={t("how.title")} description={t("how.description")} />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <HowStep
              icon={<PackagePlus className="h-6 w-6" aria-hidden />}
              title={t("how.step1Title")}
              body={t("how.step1Body")}
            />
            <HowStep
              icon={<Search className="h-6 w-6" aria-hidden />}
              title={t("how.step2Title")}
              body={t("how.step2Body")}
            />
            <HowStep
              icon={<Handshake className="h-6 w-6" aria-hidden />}
              title={t("how.step3Title")}
              body={t("how.step3Body")}
            />
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("categoriesEyebrow")} title={t("categories")} description={t("categoriesDescription")} />
            <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-bold text-green-dark hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {TOP_LEVEL_CATEGORIES.slice(0, 12).map((category) => (
              <CategoryCard key={category.id} category={category} href={`/listings?category=${category.slug}`} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("featuredEyebrow")} title={t("featured")} description={t("featuredDescription")} />
            <Link href="/listings?sort=most_viewed" className="inline-flex items-center gap-2 text-sm font-bold text-green-dark hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6">
            {featured.length > 0 ? (
              <ListingGrid listings={featured.slice(0, 8)} />
            ) : (
              <EmptyState
                title={t("featuredEmpty")}
                description={t("featuredEmptyHint")}
                action={<HomeAction href={addHref}>{t("cta")}</HomeAction>}
              />
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow={t("latestEyebrow")} title={t("latest")} description={t("latestDescription")} />
            <Link href="/listings" className="inline-flex items-center gap-2 text-sm font-bold text-green-dark hover:underline">
              {tc("viewAll")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6">
            {latest.length > 0 ? (
              <ListingGrid listings={latest} />
            ) : (
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={<HomeAction href={addHref}>{t("emptyAction")}</HomeAction>}
              />
            )}
          </div>
        </section>

        <section className="grid gap-6 rounded-[28px] bg-navy p-6 text-white md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
          <div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-green-light">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight md:text-3xl">{t("trust.title")}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 md:text-base">{t("trust.description")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustItem title={t("trust.item1Title")} body={t("trust.item1Body")} />
            <TrustItem title={t("trust.item2Title")} body={t("trust.item2Body")} />
            <TrustItem title={t("trust.item3Title")} body={t("trust.item3Body")} />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-green/20 bg-green-light p-6 md:p-8 lg:p-10">
          <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-green/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-green-dark">{t("ctaEyebrow")}</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-extrabold tracking-tight text-navy md:text-3xl">{t("ctaTitle")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70 md:text-base">{t("ctaDescription")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              <HomeAction href={addHref}>{t("cta")}</HomeAction>
              <Link href="/listings" className="btn-secondary min-h-12 px-6">
                {t("browseListings")}
              </Link>
            </div>
          </div>
        </section>
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
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-green-dark">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{title}</h2>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-muted md:text-base">{description}</p> : null}
    </div>
  );
}

function HowStep({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-light text-green-dark">{icon}</span>
      <h3 className="mt-5 text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <Repeat2 className="h-5 w-5 text-green-light" aria-hidden />
      <h3 className="mt-4 text-sm font-extrabold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/65">{body}</p>
    </article>
  );
}

function HomeAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn-primary min-h-12 px-6">
      {children}
    </Link>
  );
}
