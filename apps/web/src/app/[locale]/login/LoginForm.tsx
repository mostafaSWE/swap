"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    <div className="app-container flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo />
        <h1 className="text-2xl font-bold text-ink">{t("loginTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          type="email"
          label={t("email")}
          autoComplete="email"
          error={errors.email && t("errorGeneric")}
          {...register("email", { required: true })}
        />
        <FormInput
          type="password"
          label={t("password")}
          autoComplete="current-password"
          error={errors.password && t("errorGeneric")}
          {...register("password", { required: true })}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <CTAButton type="submit" disabled={isSubmitting}>
          {t("loginButton")}
        </CTAButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-green">
          {t("createOne")}
        </Link>
      </p>
    </div>
  );
}
