"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { href: "/", key: "home" },
  { href: "/categories", key: "categories" },
  { href: "/listings", key: "browseListings" },
] as const;

const USER_LINKS = [
  { href: "/", key: "home" },
  { href: "/categories", key: "categories" },
  { href: "/listings", key: "browseListings" },
  { href: "/my-listings", key: "myListings" },
  { href: "/messages", key: "messages" },
  { href: "/profile", key: "account" },
] as const;

export function TopBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const links = isAuthenticated ? USER_LINKS : PUBLIC_LINKS;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" aria-label="JustSwap home" className="shrink-0">
            <Logo priority />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t("primaryNav")}>
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={cn(
                  "rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive(l.href) ? "bg-green-light text-green-dark" : "text-muted hover:bg-canvas hover:text-navy",
                )}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden max-w-xl flex-1 md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link href="/new-listing" className="btn-primary hidden !px-4 !py-2.5 text-sm sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              {t("addListing")}
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-secondary !px-4 !py-2.5 text-sm">
                {t("login")}
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2.5 text-sm">
                {t("register")}
              </Link>
            </div>
          )}
          <LanguageSwitcher />
          {isAuthenticated ? <NotificationBell /> : null}
          {!isAuthenticated ? (
            <Link href="/login" className="btn-primary !px-3 !py-2 text-xs sm:hidden">
              {t("login")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
