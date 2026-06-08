"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { getApi } from "@/lib/api";

/**
 * Lets a user request account or item verification (manual admin review, no
 * payment in MVP). Requires the backend API. TODO (Phase 2): payment + workflow.
 */
export function RequestVerification({
  type,
  listingId,
}: {
  type: "account" | "item";
  listingId?: string;
}) {
  const t = useTranslations("listing");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit() {
    const api = getApi();
    if (!api) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      await api.createVerification({ type, listing_id: listingId ?? null });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-center text-sm text-green-dark">✓ {t("verifiedAccount")}</p>;
  }

  return (
    <button type="button" onClick={submit} disabled={state === "sending"} className="btn-secondary w-full">
      <BadgeCheck className="h-4 w-4" aria-hidden />
      {type === "account" ? t("verifiedAccount") : t("verifiedItem")}
      {state === "error" ? " — API off" : ""}
    </button>
  );
}
