"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Share the current page via the native share sheet, with a copy-link fallback.
 * `variant="icon"` renders a compact round control for the listing header.
 */
export function ShareButton({
  title,
  text,
  variant = "button",
  className,
}: {
  title: string;
  text?: string;
  variant?: "button" | "icon";
  className?: string;
}) {
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

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={copied ? t("linkCopied") : t("share")}
        title={copied ? t("linkCopied") : t("share")}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-linestrong hover:text-ink active:scale-90 motion-safe:transition-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          copied && "border-accent/40 text-accent",
          className,
        )}
      >
        {copied ? <Check className="h-5 w-5" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
      </button>
    );
  }

  return (
    <button type="button" onClick={share} className={cn("btn-secondary w-full", className)}>
      {copied ? <Check className="h-5 w-5" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
      {copied ? t("linkCopied") : t("share")}
    </button>
  );
}
