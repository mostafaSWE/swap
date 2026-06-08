"use client";

import { Grid2x2, Home, MessageCircle, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  icon: typeof Home;
  key: "home" | "categories" | "add" | "messages" | "account";
  primary?: boolean;
};

const TABS: Tab[] = [
  { href: "/", icon: Home, key: "home" },
  { href: "/categories", icon: Grid2x2, key: "categories" },
  { href: "/new-listing", icon: Plus, key: "add", primary: true },
  { href: "/messages", icon: MessageCircle, key: "messages" },
  { href: "/profile", icon: User, key: "account" },
];

/**
 * Fixed mobile bottom navigation. The center "Add" tab is a raised FAB.
 * Hit targets ≥44px; respects the iOS safe-area inset.
 */
export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-app items-center justify-around px-2 py-1.5">
        {TABS.map(({ href, icon: Icon, key, primary }) => {
          if (primary) {
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-label={t(key)}
                  className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-green text-white shadow-elevated ring-4 ring-white transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={2.4} />
                </Link>
              </li>
            );
          }
          const active = isActive(href);
          return (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-[10.5px] font-medium",
                  active ? "text-green-dark" : "text-muted",
                )}
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden strokeWidth={active ? 2.2 : 1.9} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
