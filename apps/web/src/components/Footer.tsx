import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const lg = await getTranslations("legal");

  const marketplaceLinks = [
    { href: "/", label: nav("home") },
    { href: "/categories", label: nav("categories") },
    { href: "/listings", label: nav("browseListings") },
  ];
  const legalLinks = [
    { href: "/legal", label: lg("eyebrow") },
    { href: "/disclaimer", label: t("disclaimer") },
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
    { href: "/safety", label: t("safety") },
    { href: "/support", label: t("support") },
  ];

  return (
    <footer className="border-t border-line bg-surface pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 py-8 sm:px-6 md:grid-cols-[1.35fr_0.8fr_1fr] md:gap-8 md:py-10 lg:px-8">
        <div className="max-w-md">
          <Link href="/" aria-label="JustSwap home" className="inline-flex">
            <Logo />
          </Link>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted md:mt-4 md:line-clamp-none">{t("description")}</p>
        </div>

        <div className="grid gap-2 md:hidden">
          <FooterAccordion title={t("marketplace")} links={marketplaceLinks} />
          <FooterAccordion title={t("legal")} links={legalLinks} />
        </div>

        <FooterColumn title={t("marketplace")} links={marketplaceLinks} />

        <FooterColumn title={t("legal")} links={legalLinks} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-2 px-4 py-4 text-center text-xs leading-5 text-muted sm:flex-row sm:justify-between sm:px-6 sm:text-start lg:px-8">
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
    <div className="hidden md:block">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterAccordion({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <details className="group rounded-2xl border border-line bg-canvas/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="grid gap-1 px-4 pb-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block rounded-xl py-2 text-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
