import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Link } from "@/i18n/navigation";

export default async function CategoriesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const activeLocale = (await getLocale()) as Locale;
  const t = await getTranslations("nav");

  return (
    <AppShell>
      <div className="px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-ink">{t("categories")}</h1>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {TOP_LEVEL_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/listings?category=${cat.slug}`}
              className="card flex flex-col items-center gap-2 p-4"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-light text-green-dark">
                <CategoryIcon icon={cat.icon} className="h-6 w-6" />
              </span>
              <span className="text-center text-xs font-medium text-ink">
                {localizedName(cat, activeLocale)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
