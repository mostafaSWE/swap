"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { updateProfile } from "@swap/api";
import { LIMITS } from "@swap/config";
import type { Profile } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { FormAlert, FormInput, FormTextarea } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { AvatarUpload } from "@/components/AvatarUpload";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<Values>({
    defaultValues: {
      full_name: profile.full_name,
      username: profile.username,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });
  const bioLen = (watch("bio") ?? "").length;

  async function onSubmit(values: Values) {
    setError(null);
    setSaved(false);
    const patch = { ...values, country_id: countryId || null, city_id: cityId || null, avatar_url: avatarUrl };
    try {
      const api = getApi();
      if (api) await api.updateMe(patch);
      else await updateProfile(createClient(), profile.id, patch);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-center pb-2">
        <AvatarUpload userId={profile.id} name={profile.full_name} value={avatarUrl} onUploaded={setAvatarUrl} />
      </div>
      <FormInput label={t("fullName")} error={errors.full_name && t("errorGeneric")} {...register("full_name", { required: true })} />
      <FormInput label={t("username")} error={errors.username && t("errorGeneric")} {...register("username", { required: true })} />
      <FormInput label={t("phone")} type="tel" error={errors.phone && t("errorGeneric")} {...register("phone", { required: true })} />
      <FormTextarea label={tp("bio")} hint={`${bioLen}/${LIMITS.bioMax}`} maxLength={LIMITS.bioMax} {...register("bio")} />

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

      {error ? <FormAlert>{error}</FormAlert> : null}
      {saved ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-green-dark">
          <Check className="h-4 w-4" aria-hidden />
          {tc("saved")}
        </p>
      ) : null}

      <CTAButton type="submit" disabled={isSubmitting}>
        {tc("save")}
      </CTAButton>
    </form>
  );
}
