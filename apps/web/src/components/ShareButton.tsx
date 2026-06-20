"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Share the current page via the native share sheet, with a copy-link fallback. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const t = useTranslations("listing");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        /* user cancelled — nothing to do */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button type="button" onClick={share} className="btn-secondary w-full">
      {copied ? <Check className="h-5 w-5" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
      {copied ? t("linkCopied") : t("share")}
    </button>
  );
}
