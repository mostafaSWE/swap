import { getTranslations } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  // Admin guard runs only when Supabase is configured (so the skeleton is
  // viewable in local dev). In production, requireAdmin enforces access.
  if (isSupabaseConfigured()) await requireAdmin(locale);
  const t = await getTranslations("nav");

  return (
    <div className="flex min-h-dvh bg-canvas">
      <AdminSidebar />
      <div className="flex-1">
        {/* Mobile admin top bar */}
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <span className="font-bold text-navy">Admin</span>
          <Link href="/" className="text-sm text-green">
            {t("home")}
          </Link>
        </div>
        <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
