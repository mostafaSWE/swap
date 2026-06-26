"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { FormAlert } from "@/components/forms";
import { PasswordInput } from "@/components/PasswordInput";
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
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("resetTitle")}</h1>

      {done ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/25">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-sm text-muted">{t("resetDone")}</p>
        </div>
      ) : hasSession === false ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">{t("resetExpired")}</p>
          <Link href="/forgot-password" className="font-semibold text-accent hover:underline">
            {t("forgotTitle")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <PasswordInput
            label={t("newPassword")}
            autoComplete="new-password"
            error={errors.password && t("passwordTooShort")}
            {...register("password", { required: true, minLength: 6 })}
          />
          <PasswordInput
            label={t("confirmPassword")}
            autoComplete="new-password"
            error={errors.confirm && t("errorGeneric")}
            {...register("confirm", { required: true })}
          />
          {error ? <FormAlert>{error}</FormAlert> : null}
          <CTAButton type="submit" disabled={isSubmitting || hasSession === null} className="w-full">
            {t("resetSubmit")}
          </CTAButton>
        </form>
      )}
    </AuthShell>
  );
}
