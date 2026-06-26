"use client";

import {
  Flag,
  LayoutDashboard,
  ListTree,
  MapPin,
  Package,
  ScrollText,
  Tags,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { cn } from "@/lib/utils";

type AdminNavKey =
  | "dashboard"
  | "users"
  | "listings"
  | "reports"
  | "audit"
  | "categories"
  | "countries"
  | "cities";

type AdminNavItem = { href: string; key: AdminNavKey; icon: typeof Users; exact?: boolean };

const ITEMS: AdminNavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/listings", key: "listings", icon: Package },
  { href: "/admin/reports", key: "reports", icon: Flag },
  { href: "/admin/audit", key: "audit", icon: ScrollText },
  { href: "/admin/categories", key: "categories", icon: Tags },
  { href: "/admin/countries", key: "countries", icon: ListTree },
  { href: "/admin/cities", key: "cities", icon: MapPin },
];

export function AdminNavbar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Home" className="shrink-0">
            <Logo compactOnSmall />
          </Link>
          <span className="h-4 w-px bg-line hidden sm:inline" />
          <span className="font-bold text-ink text-sm sm:text-base">{t("title")}</span>
        </div>

        {/* Middle: Desktop Navigation links */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Admin Navigation">
          {ITEMS.map(({ href, key, exact, icon: Icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:bg-elevated hover:text-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <AdminLogoutButton />
        </div>
      </div>

      {/* Mobile/Tablet sub-navigation list */}
      <div className="border-t border-line md:hidden overflow-x-auto scrollbar-none whitespace-nowrap bg-canvas px-4 py-2">
        <nav className="flex gap-2" aria-label="Admin Navigation Mobile">
          {ITEMS.map(({ href, key, exact, icon: Icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold transition-all",
                  active
                    ? "bg-accent text-white"
                    : "bg-surface text-muted border border-line"
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
