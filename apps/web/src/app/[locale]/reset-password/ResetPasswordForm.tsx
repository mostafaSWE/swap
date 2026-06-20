"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  password: string;
  confirm: string;
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  // null = still checking the recovery session, false = no session (expired link).
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>();

  // The /auth/confirm callback verified the recovery token and set the session
  // cookie before redirecting here. Only a DEFINITIVE "no session" (no user, no
  // error) shows the expired-link screen; a transient/network error stays
  // optimistic and lets updateUser() be the real gate.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data, error }) => setHasSession(data.user ? true : !error ? false : true))
      .catch(() => setHasSession(true));
  }, []);

  async function onSubmit(values: Values) {
    setError(null);
    if (values.password !== values.confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    const { error } = await createClient().auth.updateUser({ password: values.password });
    if (error) {
      setError(t("resetError"));
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1600);
  }

  return (
    <div className="app-container flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo priority />
        <h1 className="text-2xl font-bold text-ink">{t("resetTitle")}</h1>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-light text-green-dark">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-sm text-ink/80">{t("resetDone")}</p>
        </div>
      ) : hasSession === false ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink/80">{t("resetExpired")}</p>
          <Link href="/forgot-password" className="font-semibold text-green">
            {t("forgotTitle")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            type="password"
            label={t("newPassword")}
            autoComplete="new-password"
            error={errors.password && t("passwordTooShort")}
            {...register("password", { required: true, minLength: 6 })}
          />
          <FormInput
            type="password"
            label={t("confirmPassword")}
            autoComplete="new-password"
            error={errors.confirm && t("errorGeneric")}
            {...register("confirm", { required: true })}
          />
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <CTAButton type="submit" disabled={isSubmitting || hasSession === null}>
            {t("resetSubmit")}
          </CTAButton>
        </form>
      )}
    </div>
  );
}
