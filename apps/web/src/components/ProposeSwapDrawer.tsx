"use client";

import { useState } from "react";
import { Repeat2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SwapApiError } from "@swap/api";
import { MAX_PROPOSAL_ITEMS } from "@swap/validation";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { isEmailNotVerifiedError } from "@/lib/api-errors";
import { useRouter } from "@/i18n/navigation";
import { ListingPicker } from "./ListingPicker";
import { FormTextarea } from "./forms";
import { CTAButton } from "./CTAButton";
import { SafetyDisclaimer } from "./SafetyDisclaimer";
import { cn } from "@/lib/utils";

/**
 * "Propose an exchange" — the core barter entry point (spec §3.4). Opens a bottom
 * sheet from the listing detail page: the viewer picks 1..n of their own items
 * to offer (bundle support) + an optional note, and submits a swap proposal via
 * the backend, which creates the proposal + its 1:1 conversation. This sheet is
 * also the proposal-confirmation screen, so it carries the safety disclaimer.
 */
export function ProposeSwapDrawer({
  targetListingId,
  className,
  compactLabel = false,
}: {
  targetListingId: string;
  className?: string;
  compactLabel?: boolean;
}) {
  const t = useTranslations("proposal");
  const tc = useTranslations("common");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDrawer() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    setSelected([]);
    setNote("");
    setError(null);
    setOpen(true);
  }

  async function submit() {
    if (!selected.length || saving) return;
    const api = getApi();
    if (!api) {
      setError(t("apiRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const proposal = await api.createProposal({
        listing_id: targetListingId,
        offered_listing_ids: selected,
        note: note.trim() || null,
      });
      router.push(proposal.conversation_id ? `/messages/${proposal.conversation_id}` : "/messages");
    } catch (e) {
      setError(
        isEmailNotVerifiedError(e) ? tAuth("verifyRequired") : e instanceof SwapApiError ? e.message : t("error"),
      );
      setSaving(false);
    }
  }

  return (
    <>
      <CTAButton variant="secondary" onClick={openDrawer} className={cn("w-full", className)}>
        <Repeat2 className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate">{compactLabel ? t("ctaShort") : t("cta")}</span>
      </CTAButton>

      {open && userId ? (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="animate-slide-up flex max-h-[90dvh] w-full max-w-app flex-col rounded-t-card bg-surface sm:rounded-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold text-ink">{t("title")}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={tc("close")}>
                <X className="h-5 w-5 text-muted" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <SafetyDisclaimer variant="compact" />

              <div>
                <h3 className="font-semibold text-ink">{t("chooseItems")}</h3>
                <p className="mb-3 text-xs text-muted">{t("chooseItemsHint")}</p>
                <ListingPicker
                  ownerId={userId}
                  excludeListingId={targetListingId}
                  value={selected}
                  onChange={setSelected}
                  max={MAX_PROPOSAL_ITEMS}
                />
              </div>

              <FormTextarea
                label={t("note")}
                placeholder={t("notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />

              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </div>

            <div className="border-t border-line px-5 py-4">
              {selected.length ? (
                <p className="mb-2 text-center text-xs text-muted">
                  {t("selected", { count: selected.length })}
                </p>
              ) : null}
              <CTAButton onClick={submit} disabled={!selected.length || saving} className="w-full">
                {saving ? t("sending") : t("send")}
              </CTAButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
