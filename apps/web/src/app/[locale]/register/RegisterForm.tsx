"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRY_BY_ID } from "@swap/config";
import type { Locale } from "@swap/types";
import { updateProfile } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/forms";
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
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

    // The handle_new_user trigger created the profile; add country/city.
    if (data.user && (countryId || cityId)) {
      try {
        await updateProfile(supabase, data.user.id, {
          country_id: countryId || null,
          city_id: cityId || null,
        });
      } catch {
        /* non-fatal — user can complete this on profile edit */
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-container flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo />
        <h1 className="text-2xl font-bold text-ink">{t("registerTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput label={t("fullName")} error={errors.full_name && t("errorGeneric")} {...register("full_name", { required: true })} />
        <FormInput label={t("username")} error={errors.username && t("errorGeneric")} {...register("username", { required: true })} />
        <FormInput type="email" label={t("email")} autoComplete="email" error={errors.email && t("errorGeneric")} {...register("email", { required: true })} />
        <FormInput type="tel" label={t("phone")} hint={tc("optional")} inputMode="tel" {...register("phone")} />

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

        <FormInput type="password" label={t("password")} autoComplete="new-password" error={errors.password && t("errorGeneric")} {...register("password", { required: true, minLength: 6 })} />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <CTAButton type="submit" disabled={isSubmitting}>
          {t("registerButton")}
        </CTAButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-green">
          {t("loginInstead")}
        </Link>
      </p>
    </div>
  );
}
