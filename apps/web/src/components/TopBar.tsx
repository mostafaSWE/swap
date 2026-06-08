import { Bell, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Sticky top app bar: menu, logo, notifications placeholder, language switch. */
export function TopBar() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" aria-label={t("menu")} className="text-ink">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link href="/" aria-label="Swap home">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {/* TODO (Phase 2): real notifications system. */}
          <button type="button" aria-label={t("notifications")} className="relative text-ink">
            <Bell className="h-6 w-6" aria-hidden />
            <span className="absolute end-0 top-0 h-2 w-2 rounded-full bg-green" />
          </button>
        </div>
      </div>
    </header>
  );
}
