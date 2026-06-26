import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryIcon } from "./CategoryIcon";

/**
 * The single most important fact on the page: what the owner wants in exchange.
 * Replaces the old gives⇄wants comparison — the viewer is already looking at
 * what's on offer, so this highlights only the ask. Accent-framed so it reads as
 * the focal point. Falls back to an honest "open to offers" state when the owner
 * didn't name a specific item (the field can be blank).
 */
export function WantedCard({
  wanted,
  categoryIcon,
}: {
  wanted: string;
  categoryIcon: string;
}) {
  const t = useTranslations("listing");
  const text =
    wanted.trim() === "__any__"
      ? t("openToAnyExchange")
      : wanted.trim() || t("openToOffers");


  return (
    <section className="overflow-hidden rounded-card border border-accent/30 bg-accent-soft shadow-card">
      <div className="flex items-center gap-2 px-4 pt-4">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-glow"
          aria-hidden
        >
          <ArrowLeftRight className="h-4 w-4 rtl-flip" />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-wide text-accent">{t("wantedExchange")}</h2>
      </div>
      <div className="flex items-center gap-3 p-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-surface text-accent"
          aria-hidden
        >
          <CategoryIcon icon={categoryIcon} className="h-7 w-7" />
        </span>
        <p className="min-w-0 flex-1 text-pretty text-base font-semibold leading-6 text-ink">{text}</p>
      </div>
    </section>
  );
}
