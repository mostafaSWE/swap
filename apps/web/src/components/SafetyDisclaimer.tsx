import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Platform-responsibility disclaimer. Shown on listing details, before starting a
 * chat, and on the safety page. Same `variant` API as before — restyled to a
 * softer amber card with clearer hierarchy.
 */
export function SafetyDisclaimer({ variant = "full" }: { variant?: "full" | "compact" }) {
  const t = useTranslations("safety");

  if (variant === "compact") {
    return (
      <div className="flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10 p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">{t("points.userResponsibility")}</p>
      </div>
    );
  }

  const points = ["noOwn", "noBuy", "noSell", "noGuarantee", "noEscrow", "noCondition", "userResponsibility"] as const;

  return (
    <section className={cn("rounded-card border border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10 p-4")}>
      <h3 className="mb-2 flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        {t("disclaimerTitle")}
      </h3>
      <ul className="list-disc space-y-1 ps-5 text-sm text-amber-800 dark:text-amber-200/90 marker:text-amber-500 dark:marker:text-amber-400/70">
        {points.map((p) => (
          <li key={p}>{t(`points.${p}`)}</li>
        ))}
      </ul>
    </section>
  );
}
