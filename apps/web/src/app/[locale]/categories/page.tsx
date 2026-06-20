import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import type { Locale } from "@swap/types";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("categories") };
}
import { AppShell } from "@/components/AppShell";
import { CategoryCard } from "@/components/CategoryCard";

export default async function CategoriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <AppShell>
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
