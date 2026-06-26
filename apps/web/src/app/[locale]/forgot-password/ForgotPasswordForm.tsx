"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { FormAlert, FormInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<{ email: string }>();

  async function onSubmit({ email }: { email: string }) {
    setError(null);
    const supabase = createClient();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/${locale}/reset-password`,
    });
    // Always show success — never reveal whether an email is registered.
    if (error) console.error("[forgot-password]", error.message);
    setSent(true);
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("forgotTitle")}</h1>

      {sent ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/25">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-sm text-muted">{t("forgotSent")}</p>
          <Link href="/login" className="mt-2 font-semibold text-accent hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t("forgotHint")}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormInput
              type="email"
              label={t("email")}
              autoComplete="email"
              error={errors.email && t("errorGeneric")}
              {...register("email", { required: true })}
            />
            {error ? <FormAlert>{error}</FormAlert> : null}
            <CTAButton type="submit" disabled={isSubmitting} className="w-full">
              {t("forgotSubmit")}
            </CTAButton>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent hover:underline">
              {t("backToLogin")}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
