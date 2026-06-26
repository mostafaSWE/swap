import { Home, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/AppShell";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <AppShell>
      <section className="mx-auto flex min-h-[62vh] w-full max-w-[960px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-light text-green-dark">
          <SearchX className="h-8 w-8" aria-hidden />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-green-dark">{t("eyebrow")}</p>
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
