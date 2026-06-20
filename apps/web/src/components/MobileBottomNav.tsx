"use client";

import { Grid2x2, Home, LogIn, MessageCircle, PackageSearch, Plus, User, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type TabKey = "home" | "categories" | "browseListings" | "add" | "messages" | "account" | "login" | "register";

type Tab = {
  href: string;
  icon: typeof Home;
  key: TabKey;
  primary?: boolean;
};

const PUBLIC_TABS: Tab[] = [
  { href: "/", icon: Home, key: "home" },
  { href: "/categories", icon: Grid2x2, key: "categories" },
  { href: "/listings", icon: PackageSearch, key: "browseListings" },
  { href: "/login", icon: LogIn, key: "login" },
  { href: "/register", icon: UserPlus, key: "register" },
];

const USER_TABS: Tab[] = [
  { href: "/", icon: Home, key: "home" },
  { href: "/categories", icon: Grid2x2, key: "categories" },
  { href: "/new-listing", icon: Plus, key: "add", primary: true },
  { href: "/messages", icon: MessageCircle, key: "messages" },
  { href: "/profile", icon: User, key: "account" },
];

export function MobileBottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = isAuthenticated ? USER_TABS : PUBLIC_TABS;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("mobileNav")}
    >
      <ul className="mx-auto flex w-full max-w-app items-center justify-around px-1.5 py-1.5">
        {tabs.map(({ href, icon: Icon, key, primary }) => {
          if (primary) {
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-label={t(key)}
                  className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-green text-white shadow-elevated ring-4 ring-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark"
                >
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={2.4} />
                </Link>
              </li>
            );
          }
          const active = isActive(href);
          return (
            <li key={key} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-center text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
                  active ? "bg-green-light text-green-dark" : "text-muted hover:text-navy",
                )}
              >
                <Icon className="h-[21px] w-[21px]" aria-hidden strokeWidth={active ? 2.3 : 2} />
                <span className="max-w-full truncate">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
