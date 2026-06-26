"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRY_BY_ID } from "@swap/config";
import type { Locale } from "@swap/types";
import { updateProfile } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { FormAlert, FormInput, FormSection } from "@/components/forms";
import { PasswordInput } from "@/components/PasswordInput";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    setError(null);
    const supabase = createClient();
    // Phone is stored with the selected country's dial code.
    const dial = countryId ? COUNTRY_BY_ID[countryId]?.phone_code ?? "" : "";
    const phone = values.phone ? `${dial}${values.phone.replace(/^0+/, "")}` : null;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${base}/${locale}/onboarding`,
        data: {
          full_name: values.full_name,
          username: values.username,
          phone,
          preferred_language: locale,
        },
      },
    });
    if (signUpError) {
      setError(t("errorGeneric"));
      return;
    }

    // Email confirmation on → no session yet. Tell the user to check their inbox;
    // country/city/avatar are collected on /onboarding after they confirm.
    if (!data.session) {
      setEmailSent(true);
      return;
    }

    // Confirmation off → we have a session. Persist country/city, then onboard.
    if (data.user && (countryId || cityId)) {
      try {
        await updateProfile(supabase, data.user.id, {
          country_id: countryId || null,
          city_id: cityId || null,
        });
      } catch {
        /* non-fatal — user can complete this in onboarding */
      }
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (emailSent) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/25">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-ink">{t("confirmEmailTitle")}</h1>
          <p className="text-sm text-muted">{t("confirmEmailBody")}</p>
          <Link href="/login" className="mt-2 font-semibold text-accent hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("registerTitle")}</h1>
        <p className="text-sm text-muted">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <FormSection title={t("secPersonal")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label={t("fullName")} autoComplete="name" error={errors.full_name && t("errorGeneric")} {...register("full_name", { required: true })} />
            <FormInput label={t("username")} autoComplete="username" error={errors.username && t("errorGeneric")} {...register("username", { required: true })} />
          </div>
        </FormSection>

        <FormSection title={t("secContact")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput type="email" label={t("email")} autoComplete="email" error={errors.email && t("errorGeneric")} {...register("email", { required: true })} />
            <FormInput type="tel" label={t("phone")} error={errors.phone && t("errorGeneric")} inputMode="tel" autoComplete="tel" {...register("phone", { required: true })} />
          </div>
        </FormSection>

        <FormSection title={t("secLocation")}>
          <CountryCitySelector
            countryId={countryId}
            cityId={cityId}
            onCountryChange={setCountryId}
            onCityChange={setCityId}
            countryLabel={t("country")}
            cityLabel={t("city")}
            countryPlaceholder={tc("selectCountry")}
            cityPlaceholder={tc("selectCity")}
          />
        </FormSection>

        <FormSection title={t("secSecurity")}>
          <PasswordInput
            label={t("password")}
            autoComplete="new-password"
            error={errors.password && (errors.password.type === "minLength" ? t("passwordTooShort") : t("errorGeneric"))}
            {...register("password", { required: true, minLength: 6 })}
          />
        </FormSection>

        {error ? <FormAlert>{error}</FormAlert> : null}

        <CTAButton type="submit" disabled={isSubmitting} className="w-full">
          {t("registerButton")}
        </CTAButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          {t("loginInstead")}
        </Link>
      </p>
    </AuthShell>
  );
}
