"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { saveListing, unsaveListing } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Save / unsave a listing. Writes to the DB through the backend API (with a
 * direct-Supabase fallback). The label is action/state aware — "Save" → "Saved"
 * — and the accessible name flips to "Remove from saved" once saved, so the
 * control never shows the misleading "Saved" nav-label as a button.
 * `variant="icon"` renders a compact round bookmark for the header / sticky bar.
 */
export function SaveButton({
  listingId,
  initialSaved = false,
  variant = "button",
  className,
}: {
  listingId: string;
  initialSaved?: boolean;
  variant?: "button" | "icon";
  className?: string;
}) {
  const t = useTranslations("listing");
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const accessibleName = saved ? t("unsave") : t("save");

  async function toggle() {
    setBusy(true);
    const nextSaved = !saved;
    setSaved(nextSaved); // optimistic
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const api = getApi();
      if (api) {
        await (nextSaved ? api.saveListing(listingId) : api.unsaveListing(listingId));
      } else {
        await (nextSaved
          ? saveListing(supabase, user.id, listingId)
          : unsaveListing(supabase, user.id, listingId));
      }
      router.refresh();
    } catch {
      setSaved(!nextSaved); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={accessibleName}
        aria-pressed={saved}
        title={accessibleName}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-surface transition-colors active:scale-90 motion-safe:transition-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          saved ? "border-accent/40 text-accent" : "border-line text-muted hover:text-ink hover:border-linestrong",
          className,
        )}
      >
        <Bookmark
          className={cn("h-5 w-5 transition-transform", saved && "fill-accent scale-110")}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={accessibleName}
      aria-pressed={saved}
      className={cn("btn-secondary w-full active:scale-[0.97]", className)}
    >
      <Bookmark className={cn("h-5 w-5 transition-transform", saved && "fill-accent text-accent")} aria-hidden />
      {saved ? t("saved") : t("save")}
    </button>
  );
}
