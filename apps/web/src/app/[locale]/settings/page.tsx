import { Globe } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/i18n/navigation";

export default async function SettingsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");
  const ts = await getTranslations("safety");
  const tt = await getTranslations("terms");
  const tb = await getTranslations("block");

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{tn("settings")}</h1>

        <div className="card flex items-center justify-between p-4">
          <span className="flex items-center gap-2 font-medium text-ink">
            <Globe className="h-5 w-5 text-muted" aria-hidden />
            {tc("language")}
          </span>
          <LanguageSwitcher />
        </div>

        <div className="card divide-y divide-line">
          <Link href="/settings/blocked" className="block px-4 py-3 text-ink">{tb("blockedTitle")}</Link>
          <Link href="/safety" className="block px-4 py-3 text-ink">{ts("title")}</Link>
          <Link href="/terms" className="block px-4 py-3 text-ink">{tt("title")}</Link>
        </div>

        <LogoutButton />
      </div>
    </AppShell>
  );
}
