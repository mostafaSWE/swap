"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { FormInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  email: string;
  password: string;
}

/**
 * Separate admin sign-in (spec §4.1). Authenticates, then verifies `is_admin`
 * before redirecting to /admin; a non-admin login is signed back out with an
 * error so this page never grants a foothold to a regular account.
 */
export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const ta = useTranslations("auth");
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
    const { data, error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError || !data.user) {
      setError(t("invalid"));
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setError(t("notAdmin"));
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="app-container flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-card bg-accent/15 text-accent ring-1 ring-accent/25">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          type="email"
          label={ta("email")}
          autoComplete="email"
          error={errors.email && ta("errorGeneric")}
          {...register("email", { required: true })}
        />
        <FormInput
          type="password"
          label={ta("password")}
          autoComplete="current-password"
          error={errors.password && ta("errorGeneric")}
          {...register("password", { required: true })}
        />

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <CTAButton type="submit" disabled={isSubmitting} className="w-full">
          {t("button")}
        </CTAButton>
      </form>
    </div>
  );
}
