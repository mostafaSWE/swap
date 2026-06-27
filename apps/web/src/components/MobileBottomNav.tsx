"use client";

import { Grid2x2, Home, LogIn, MessageCircle, PackageSearch, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type TabKey = "home" | "categories" | "browseListings" | "add" | "messages" | "account" | "login";

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
  const listings = useTranslations("listings");
  const pathname = usePathname();
  const tabs = isAuthenticated ? USER_TABS : PUBLIC_TABS;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const labelFor = (key: TabKey) => {
    if (key === "browseListings") return listings("title");
    return t(key);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 shadow-[0_-12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden"
      aria-label={t("mobileNav")}
    >
      <ul className="mx-auto flex w-full max-w-app items-end justify-around px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5">
        {tabs.map(({ href, icon: Icon, key, primary }) => {
          if (primary) {
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-label={labelFor(key)}
                  className="flex h-12 w-12 -translate-y-2.5 items-center justify-center rounded-full bg-accent text-white shadow-glow ring-4 ring-canvas transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover"
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
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-center text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
                  active ? "bg-accent-soft text-accent shadow-sm" : "text-muted hover:bg-elevated hover:text-ink",
                )}
                >
                <Icon className="h-[21px] w-[21px]" aria-hidden strokeWidth={active ? 2.3 : 2} />
                <span className="max-w-full truncate">{labelFor(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
