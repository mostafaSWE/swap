"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Rating } from "@swap/types";
import { RatingStars } from "./RatingStars";
import { Sheet } from "./Sheet";
import { FormTextarea } from "./forms";
import { CTAButton } from "./CTAButton";

/**
 * Post-swap rating sheet (spec §3.4/§3.6). Opt-in and text-optional: shown once
 * after a swap completes (dismissible via "Maybe later"), and reachable later
 * from the completed proposal card. The parent owns the API call + busy/error.
 */
export function SwapRatingPrompt({
  otherName,
  initial,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  otherName: string;
  initial: Rating | null;
  busy: boolean;
  error: string | null;
  onSubmit: (stars: number, comment: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("proposal");
  const tc = useTranslations("common");
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");

  return (
    <Sheet title={t("rateTitle")} onClose={onClose} closeLabel={tc("close")} z="z-[70]">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <p className="text-sm text-muted">{t("rateSubtitle", { name: otherName })}</p>
        <div className="flex flex-col items-center gap-2 py-2">
          <RatingStars
            value={stars}
            onChange={setStars}
            size="lg"
            groupLabel={t("rateStarsLabel")}
            starLabel={(n) => t("rateStarAria", { count: n })}
          />
        </div>
        <FormTextarea
          label={t("rateCommentLabel")}
          placeholder={t("rateCommentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="space-y-2 border-t border-line px-5 py-4">
        <CTAButton onClick={() => onSubmit(stars, comment)} disabled={!stars || busy} className="w-full">
          {busy ? t("rateSubmitting") : t("rateSubmit")}
        </CTAButton>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-full rounded-pill py-2 text-sm font-semibold text-muted hover:bg-canvas"
        >
          {t("rateLater")}
        </button>
      </div>
    </Sheet>
  );
}
