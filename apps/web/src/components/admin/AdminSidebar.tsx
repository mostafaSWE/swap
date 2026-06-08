"use client";

import {
  BadgeCheck,
  Flag,
  LayoutDashboard,
  ListTree,
  MapPin,
  Package,
  Tags,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

type AdminNavKey =
  | "dashboard"
  | "users"
  | "listings"
  | "reports"
  | "verifications"
  | "categories"
  | "countries"
  | "cities";

type AdminNavItem = { href: string; key: AdminNavKey; icon: typeof Users; exact?: boolean };

const ITEMS: AdminNavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/listings", key: "listings", icon: Package },
  { href: "/admin/reports", key: "reports", icon: Flag },
  { href: "/admin/verifications", key: "verifications", icon: BadgeCheck },
  { href: "/admin/categories", key: "categories", icon: Tags },
  { href: "/admin/countries", key: "countries", icon: ListTree },
  { href: "/admin/cities", key: "cities", icon: MapPin },
];

export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-navy p-4 text-white md:flex">
      <div className="mb-6 flex items-center gap-2 rounded-card bg-white/10 px-3 py-2">
        <Logo withText={false} />
        <span className="font-bold">{t("title")}</span>
      </div>
      {ITEMS.map(({ href, key, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-green text-white" : "text-white/70 hover:bg-white/10",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </aside>
  );
}
