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

/** Fixed mobile bottom navigation. The center "Add" tab is emphasized. */
export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky bottom-0 z-30 border-t border-line bg-white md:hidden">
      <ul className="mx-auto flex max-w-app items-center justify-around px-2 py-1.5">
        {TABS.map(({ href, icon: Icon, key, primary }) => {
          const active = isActive(href);
          if (primary) {
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-label={t(key)}
                  className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-green text-white shadow-elevated"
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </Link>
              </li>
            );
          }
          return (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px]",
                  active ? "text-green" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
