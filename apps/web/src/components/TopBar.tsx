import { Bell, Menu, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

const DESKTOP_LINKS = [
  { href: "/", key: "home" },
  { href: "/listings", key: "categories" },
  { href: "/messages", key: "messages" },
  { href: "/profile", key: "account" },
] as const;

/** Sticky top app bar. Shows desktop nav links on md+, menu icon on mobile. */
export function TopBar() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" aria-label={t("menu")} className="text-ink md:hidden">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link href="/" aria-label="Swap home">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="ms-4 hidden items-center gap-1 md:flex">
            {DESKTOP_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className="rounded-pill px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/new-listing" className="btn-primary hidden !px-4 !py-2 text-sm md:inline-flex">
            <Plus className="h-4 w-4" aria-hidden />
            {t("addListing")}
          </Link>
          <LanguageSwitcher />
          {/* TODO (Phase 2): real notifications system. */}
          <button type="button" aria-label={t("notifications")} className="relative text-ink">
            <Bell className="h-6 w-6" aria-hidden />
            <span className="absolute end-0 top-0 h-2 w-2 rounded-full bg-green" />
          </button>
        </div>
      </div>
    </header>
  );
}
