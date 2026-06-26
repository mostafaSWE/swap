"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { isAuthApiError } from "@supabase/supabase-js";
import type { Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { FormAlert, FormInput } from "@/components/forms";
import { PasswordInput } from "@/components/PasswordInput";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  email: string;
  password: string;
}

export function LoginForm({ linkError = false }: { linkError?: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [error, setError] = useState<string | null>(linkError ? t("linkExpired") : null);
  // An expired confirmation link, or a sign-in blocked by an unconfirmed email, both
  // mean the user needs a fresh confirmation link — so show the resend affordance.
  const [needsConfirm, setNeedsConfirm] = useState(linkError);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    setError(null);
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      // Supabase returns a stable code for an unverified account — surface that
      // clearly (with a resend option) instead of a misleading "wrong credentials".
      if (isAuthApiError(error) && error.code === "email_not_confirmed") {
        setNeedsConfirm(true);
        setError(t("errorEmailUnconfirmed"));
      } else {
        setError(t("errorInvalid"));
      }
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function resendConfirmation() {
    if (resend === "sending" || resend === "sent") return;
    const email = (watch("email") || "").trim();
    if (!email) {
      setError(t("errorEmailUnconfirmed"));
      return;
    }
    setResend("sending");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${base}/${locale}/onboarding` },
    });
    setResend(error ? "error" : "sent");
  }

  return (
    <AuthShell>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("loginTitle")}</h1>
        <p className="text-sm text-muted">{t("loginSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <FormInput
          type="email"
          label={t("email")}
          autoComplete="email"
          error={errors.email && t("errorGeneric")}
          {...register("email", { required: true })}
        />
        <PasswordInput
          label={t("password")}
          autoComplete="current-password"
          error={errors.password && t("errorGeneric")}
          {...register("password", { required: true })}
        />

        <div className="-mt-1 text-end">
          <Link
            href="/forgot-password"
            className="-me-1 inline-flex min-h-[2.25rem] items-center rounded-lg px-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {t("forgotTitle")}
          </Link>
        </div>

        {error ? <FormAlert>{error}</FormAlert> : null}

        {needsConfirm ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm">
            {resend === "sent" ? (
              <p className="font-medium text-success">{t("verifyBannerSent")}</p>
            ) : (
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={resend === "sending"}
                className="font-bold text-accent hover:underline disabled:opacity-60"
              >
                {resend === "sending" ? t("verifyBannerSending") : t("resendConfirmation")}
              </button>
            )}
            {resend === "error" ? (
              <p className="mt-1 text-xs font-medium text-danger">{t("verifyBannerError")}</p>
            ) : null}
          </div>
        ) : null}

        <CTAButton type="submit" disabled={isSubmitting} className="w-full">
          {t("loginButton")}
        </CTAButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          {t("createOne")}
        </Link>
      </p>
    </AuthShell>
  );
}
