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
 * direct-Supabase fallback). `variant="icon"` renders a compact bookmark.
 */
export function SaveButton({
  listingId,
  initialSaved = false,
  variant = "button",
}: {
  listingId: string;
  initialSaved?: boolean;
  variant?: "button" | "icon";
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

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
        aria-label={t("saved")}
        aria-pressed={saved}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white transition-colors active:scale-95",
          saved ? "text-green" : "text-muted hover:text-ink",
        )}
      >
        <Bookmark className={cn("h-5 w-5", saved && "fill-green")} aria-hidden />
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className="btn-secondary w-full">
      <Bookmark className={cn("h-5 w-5", saved && "fill-green text-green")} aria-hidden />
      {t("saved")}
    </button>
  );
}
