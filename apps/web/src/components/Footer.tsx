import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-md">
          <Link href="/" aria-label="JustSwap home" className="inline-flex">
            <Logo />
          </Link>
          <p className="mt-4 text-sm leading-7 text-muted">{t("description")}</p>
        </div>

        <FooterColumn
          title={t("marketplace")}
          links={[
            { href: "/", label: nav("home") },
            { href: "/categories", label: nav("categories") },
            { href: "/listings", label: nav("browseListings") },
          ]}
        />

        <div>
          <h2 className="text-sm font-bold text-ink">{t("legal")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/disclaimer" className="text-muted transition-colors hover:text-navy">
                {t("disclaimer")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-muted transition-colors hover:text-navy">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted transition-colors hover:text-navy">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/safety" className="text-muted transition-colors hover:text-navy">
                {t("safety")}
              </Link>
            </li>
            <li>
              <a href="mailto:support@justswap.app" className="text-muted transition-colors hover:text-navy">
                {t("support")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("note")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-muted transition-colors hover:text-navy">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
