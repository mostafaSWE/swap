"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { CATEGORIES, FREE_PLAN_MAX_IMAGES, STORAGE_BUCKETS } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { FormInput, FormTextarea, SelectInput } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { ImageUploader } from "@/components/ImageUploader";
import { CTAButton } from "@/components/CTAButton";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

interface Values {
  title: string;
  description: string;
  condition: ListingCondition;
  category_id: string;
  wanted_exchange: string;
}

export function NewListingForm() {
  const t = useTranslations("newListing");
  const tc = useTranslations("common");
  const tCond = useTranslations("condition");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>({ defaultValues: { condition: "used" } });

  async function onSubmit(values: Values) {
    setError(null);
    if (!countryId || !cityId) {
      setError(tc("selectCity"));
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const payload = {
      category_id: values.category_id,
      country_id: countryId,
      city_id: cityId,
      title: values.title,
      description: values.description,
      condition: values.condition,
      wanted_exchange: values.wanted_exchange,
    };
    const images = files.slice(0, FREE_PLAN_MAX_IMAGES); // TODO (Phase 2): premium raises the limit.
    const api = getApi();

    let listingId: string;
    try {
      if (api) {
        // 1) Create via backend (validates refs + enforces limits server-side).
        const listing = await api.createListing(payload);
        listingId = listing.id;
        // 2) Signed upload per image, then register it.
        for (const file of images) {
          const { path, token } = await api.signListingImageUpload(listing.id, file.name);
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKETS.listingImages)
            .uploadToSignedUrl(path, token, file);
          if (upErr) continue;
          const { data: pub } = supabase.storage.from(STORAGE_BUCKETS.listingImages).getPublicUrl(path);
          await api.addListingImage(listing.id, pub.publicUrl);
        }
      } else {
        // Fallback: direct Supabase (RLS-protected) when the API isn't configured.
        const { data: listing, error: insertError } = await supabase
          .from("listings")
          .insert({ ...payload, owner_id: user.id, status: "active" })
          .select("id")
          .single();
        if (insertError || !listing) {
          setError(t("title"));
          return;
        }
        listingId = listing.id;
        for (let i = 0; i < images.length; i++) {
          const file = images[i]!;
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${user.id}/${listing.id}/${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.listingImages)
            .upload(path, file, { upsert: true });
          if (uploadError) continue;
          const { data: pub } = supabase.storage.from(STORAGE_BUCKETS.listingImages).getPublicUrl(path);
          await supabase.from("listing_images").insert({
            listing_id: listing.id,
            image_url: pub.publicUrl,
            sort_order: i,
          });
        }
      }
    } catch {
      setError(t("title"));
      return;
    }

    router.push(`/listings/${listingId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput label={t("fieldTitle")} error={errors.title && t("fieldTitle")} {...register("title", { required: true })} />
      <FormTextarea label={t("fieldDescription")} {...register("description")} />

      <SelectInput
        label={t("fieldCondition")}
        {...register("condition", { required: true })}
        options={[
          { value: "used", label: tCond("used") },
          { value: "new", label: tCond("new") },
        ]}
      />

      <SelectInput
        label={t("fieldCategory")}
        placeholder={tc("selectCategory")}
        error={errors.category_id && t("fieldCategory")}
        {...register("category_id", { required: true })}
        options={CATEGORIES.map((c) => ({ value: c.id, label: localizedName(c, locale) }))}
      />

      <CountryCitySelector
        countryId={countryId}
        cityId={cityId}
        onCountryChange={setCountryId}
        onCityChange={setCityId}
        countryLabel={t("fieldCountry")}
        cityLabel={t("fieldCity")}
        countryPlaceholder={tc("selectCountry")}
        cityPlaceholder={tc("selectCity")}
      />

      <FormTextarea label={t("fieldWanted")} {...register("wanted_exchange")} />

      <div>
        <p className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">{t("images")}</span>
          <span className="text-xs text-muted">{t("imagesHint", { max: FREE_PLAN_MAX_IMAGES })}</span>
        </p>
        <ImageUploader files={files} onChange={setFiles} />
      </div>

      <SafetyDisclaimer variant="compact" />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <CTAButton type="submit" disabled={isSubmitting}>
        {t("submit")}
      </CTAButton>
    </form>
  );
}
