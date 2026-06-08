"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createReport } from "@swap/api";
import type { ReportTargetType } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { SelectInput, FormTextarea } from "./forms";
import { CTAButton } from "./CTAButton";

const REASONS = ["spam", "inappropriate", "scam", "other"] as const;

/** Report trigger + modal. Files a report for any target (listing/user/etc.). */
export function ReportDialog({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function submit() {
    setState("saving");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("error");
        return;
      }
      await createReport(supabase, {
        reporterId: user.id,
        targetType,
        targetId,
        reason,
        description,
      });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger"
      >
        <Flag className="h-4 w-4" aria-hidden />
        {t("title")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-app rounded-t-card bg-white p-5 sm:rounded-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">{t("title")}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-muted" aria-hidden />
              </button>
            </div>

            {state === "done" ? (
              <p className="py-6 text-center text-green-dark">{t("success")}</p>
            ) : (
              <div className="space-y-3">
                <SelectInput
                  label={t("reason")}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))}
                />
                <FormTextarea
                  label={t("description")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <CTAButton onClick={submit} disabled={state === "saving"}>
                  {t("submit")}
                </CTAButton>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
