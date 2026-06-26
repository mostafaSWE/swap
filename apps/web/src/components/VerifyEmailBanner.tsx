"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Slim banner shown to signed-in users whose email isn't confirmed yet. The API +
 * RLS already BLOCK listing / proposing / messaging for them (EmailVerifiedGuard and
 * the `is_email_verified` policies); this just explains why and offers a one-tap
 * resend so they're never staring at a bare 403. AppShell gates it server-side, so
 * it never flashes for verified or signed-out users.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    if (status === "sending" || status === "sent") return;
    setStatus("sending");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${base}/${locale}/onboarding` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div role="status" className="border-b border-warning/25 bg-warning/10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:px-6 lg:px-8">
        <MailWarning className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">
          {status === "sent" ? t("verifyBannerSent") : t("verifyBannerText")}
        </p>
        {status !== "sent" ? (
          <button
            type="button"
            onClick={resend}
            disabled={status === "sending"}
            className="shrink-0 rounded-pill border border-warning/40 px-3 py-1.5 text-xs font-bold text-warning transition-colors hover:bg-warning/15 disabled:opacity-60"
          >
            {status === "sending" ? t("verifyBannerSending") : t("verifyBannerResend")}
          </button>
        ) : null}
        {status === "error" ? (
          <span className="w-full text-xs font-medium text-danger sm:w-auto sm:ps-1">
            {t("verifyBannerError")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
