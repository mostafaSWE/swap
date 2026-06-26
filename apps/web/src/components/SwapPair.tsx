"use client";

import { ArrowLeftRight, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingWithRelations } from "@swap/types";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

/**
 * SwapPair — JustSwap's signature component. Visualises the barter deal:
 *   [ what the owner GIVES ]  ⇄  [ what they WANT in exchange ]
 *
 * Requires i18n keys: `swap.gives`, `swap.wants`.
 */
type Size = "sm" | "md" | "lg";

const DIMS: Record<Size, { box: string; icon: string; gap: string; label: string; arrow: string }> = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4", gap: "gap-1.5", label: "text-[10px]", arrow: "h-6 w-6 p-1" },
  md: { box: "h-12 w-12", icon: "h-6 w-6", gap: "gap-2", label: "text-[11px]", arrow: "h-8 w-8 p-1.5" },
  lg: { box: "h-[76px] w-[76px]", icon: "h-8 w-8", gap: "gap-3", label: "text-xs", arrow: "h-9 w-9 p-2" },
};

export function SwapPair({
  listing,
  size = "md",
  className,
}: {
  listing: Pick<ListingWithRelations, "category" | "wanted_exchange">;
  size?: Size;
  className?: string;
}) {
  const t = useTranslations("swap");
  const d = DIMS[size];

  return (
    <div className={cn("flex items-start", d.gap, className)}>
      {/* Gives — the neutral item the owner hands over */}
      <Cell label={t("gives")} labelClass={d.label}>
        <span
          className={cn(
            "flex items-center justify-center rounded-xl border border-linestrong bg-elevated text-ink",
            d.box,
          )}
        >
          <CategoryIcon icon={listing.category?.icon ?? "other"} className={d.icon} />
        </span>
      </Cell>

      {/* Connector — terracotta swap arrow */}
      <div className="flex shrink-0 flex-col items-center justify-center self-stretch pt-2">
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-accent text-white shadow-glow ring-1 ring-accent/30",
            d.arrow,
          )}
          aria-hidden
        >
          <ArrowLeftRight className="h-full w-full rtl-flip" />
        </span>
      </div>

      {/* Wants — the highlighted thing being asked for */}
      <Cell label={t("wants")} labelClass={d.label} accent>
        <span
          className={cn(
            "flex items-center justify-center rounded-xl border border-accent/45 bg-accent-soft text-accent",
            d.box,
          )}
        >
          <Repeat2 className={d.icon} aria-hidden />
        </span>
      </Cell>
    </div>
  );
}

function Cell({
  label,
  labelClass,
  accent,
  children,
}: {
  label: string;
  labelClass: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      {children}
      <span className={cn("max-w-full truncate font-semibold uppercase tracking-wide", labelClass, accent ? "text-accent" : "text-muted")}>
        {label}
      </span>
    </div>
  );
}
