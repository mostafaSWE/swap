"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { updateProfile } from "@swap/api";
import type { Profile } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { AvatarUpload } from "@/components/AvatarUpload";
import { CTAButton } from "@/components/CTAButton";

/** Post-signup onboarding: confirm display name, pick a city, add an avatar. */
export function OnboardingForm({ profile }: { profile: Profile }) {
  const t = useTranslations("onboarding");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();

  const [countryId, setCountryId] = useState(profile.country_id ?? "");
  const [cityId, setCityId] = useState(profile.city_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<{ full_name: string }>({ defaultValues: { full_name: profile.full_name } });

  async function onSubmit(values: { full_name: string }) {
    setError(null);
    const patch = {
      full_name: values.full_name.trim() || profile.full_name,
      country_id: countryId || null,
      city_id: cityId || null,
      avatar_url: avatarUrl,
    };
    try {
      const api = getApi();
      if (api) await api.updateMe(patch);
      else await updateProfile(createClient(), profile.id, patch);
      router.push("/");
      router.refresh();
    } catch {
      setError(t("error"));
    }
  }

  return (
    <div className="app-container px-6 py-8">
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <Logo priority />
        <h1 className="mt-2 text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AvatarUpload userId={profile.id} name={profile.full_name} value={avatarUrl} onUploaded={setAvatarUrl} />

        <FormInput
          label={ta("fullName")}
          error={errors.full_name && ta("errorGeneric")}
          {...register("full_name", { required: true })}
        />

        <CountryCitySelector
          countryId={countryId}
          cityId={cityId}
          onCountryChange={setCountryId}
          onCityChange={setCityId}
          countryLabel={ta("country")}
          cityLabel={ta("city")}
          countryPlaceholder={tc("selectCountry")}
          cityPlaceholder={tc("selectCity")}
        />

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        <CTAButton type="submit" disabled={isSubmitting}>
          {t("complete")}
        </CTAButton>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full rounded-pill py-2 text-sm font-semibold text-muted hover:bg-canvas"
        >
          {t("skip")}
        </button>
      </form>
    </div>
  );
}
