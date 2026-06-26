"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
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
  const router = useRouter();
  const [error, setError] = useState<string | null>(linkError ? t("linkExpired") : null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setError(t("errorInvalid"));
      return;
    }
    router.push("/");
    router.refresh();
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
