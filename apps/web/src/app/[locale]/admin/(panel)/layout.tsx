import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AdminPanelLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  // Admin guard runs only when Supabase is configured (so the skeleton is
  // viewable in local dev). In production, requireAdmin enforces access. The
  // /admin/login page sits OUTSIDE this (panel) group, so it is never guarded.
  if (isSupabaseConfigured()) await requireAdmin(locale);

  return (
    <div className="min-h-dvh bg-canvas">
      <AdminNavbar />
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
}
