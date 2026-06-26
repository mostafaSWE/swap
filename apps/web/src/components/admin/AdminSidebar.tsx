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

export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-e border-line bg-navy p-4 text-onnavy md:flex">
      <div className="mb-6 flex items-center gap-2 rounded-card border border-white/5 bg-white/[0.04] px-3 py-2.5">
        <Logo withText={false} tone="dark" />
        <span className="font-bold text-onnavy">{t("title")}</span>
      </div>
      {ITEMS.map(({ href, key, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-accent text-white shadow-[0_4px_14px_rgba(24,182,106,0.35)]"
                : "text-onnavy/70 hover:bg-white/[0.06] hover:text-onnavy",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}
