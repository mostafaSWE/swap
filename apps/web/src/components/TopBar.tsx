"use client";

import { Bell, Menu, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS = [
  { href: "/", key: "home" },
  { href: "/listings", key: "categories" },
  { href: "/messages", key: "messages" },
  { href: "/profile", key: "account" },
] as const;

/**
 * Sticky top app bar. Mobile: logo + menu + actions. md+: nav links + a real
 * (functional) search field + Add CTA + language toggle.
 */
export function TopBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <button type="button" aria-label={t("menu")} className="text-navy md:hidden">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link href="/" aria-label="Swap home">
            <Logo />
          </Link>
          <nav className="ms-2 hidden items-center gap-1 md:flex">
            {DESKTOP_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={cn(
                  "rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  isActive(l.href) ? "bg-canvas text-navy" : "text-muted hover:bg-canvas hover:text-navy",
                )}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop search (functional — routes to /listings?search=) */}
        <div className="hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-2">
          <Link href="/new-listing" className="btn-primary hidden !px-4 !py-2 text-sm md:inline-flex">
            <Plus className="h-4 w-4" aria-hidden />
            {t("addListing")}
          </Link>
          <LanguageSwitcher />
          {/* TODO (Phase 2): real notifications system. */}
          <button type="button" aria-label={t("notifications")} className="relative text-navy">
            <Bell className="h-6 w-6" aria-hidden />
            <span className="absolute end-0 top-0 h-2 w-2 rounded-full bg-green ring-2 ring-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
