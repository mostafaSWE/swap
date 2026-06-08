"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { updateProfile } from "@swap/api";
import { LIMITS } from "@swap/config";
import type { Profile } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { FormInput, FormTextarea } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { CTAButton } from "@/components/CTAButton";

interface Values {
  full_name: string;
  username: string;
  phone: string;
  bio: string;
}

export function EditProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tp = useTranslations("profile");
  const router = useRouter();

  const [countryId, setCountryId] = useState(profile.country_id ?? "");
  const [cityId, setCityId] = useState(profile.city_id ?? "");
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      full_name: profile.full_name,
      username: profile.username,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });

  async function onSubmit(values: Values) {
    const patch = { ...values, country_id: countryId || null, city_id: cityId || null };
    const api = getApi();
    if (api) await api.updateMe(patch);
    else await updateProfile(createClient(), profile.id, patch);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput label={t("fullName")} {...register("full_name", { required: true })} />
      <FormInput label={t("username")} {...register("username", { required: true })} />
      <FormInput label={t("phone")} type="tel" {...register("phone")} />
      <FormTextarea label={tp("bio")} maxLength={LIMITS.bioMax} {...register("bio")} />

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

      {saved ? <p className="text-sm text-green-dark">{tc("save")} ✓</p> : null}

      <CTAButton type="submit" disabled={isSubmitting}>
        {tc("save")}
      </CTAButton>
    </form>
  );
}
