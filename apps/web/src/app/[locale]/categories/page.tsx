import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import type { Locale } from "@swap/types";
import { altLinks, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  const isAr = locale === "ar";
  const description = isAr
    ? "تصفّح فئات الأغراض المتاحة للمقايضة على JustSwap — إلكترونيات وأثاث وسيارات وأكثر."
    : "Browse every barter category on JustSwap — electronics, furniture, cars and more. Just swap what you have for what you need.";
  return {
    title: t("categories"),
    description,
    alternates: altLinks(locale, "/categories"),
    openGraph: { title: t("categories"), description, type: "website", url: `/${locale}/categories` },
  };
}
import { AppShell } from "@/components/AppShell";
import { CategoryCard } from "@/components/CategoryCard";

export default async function CategoriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  const breadcrumb = breadcrumbJsonLd([
    { name: t("home"), path: `/${locale}` },
    { name: t("categories"), path: `/${locale}/categories` },
  ]);

  return (
    <AppShell>
      <JsonLd data={breadcrumb} />
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{t("categories")}</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {TOP_LEVEL_CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} category={cat} href={`/listings?category=${cat.slug}`} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
