"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, ListingWithRelations, Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { FormInput, FormTextarea, FormCheckbox } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListingImageManager } from "@/components/ListingImageManager";
import { CTAButton } from "@/components/CTAButton";
import { cn } from "@/lib/utils";

interface Values {
  title: string;
  description: string;
  wanted_exchange: string;
  open_to_any?: boolean;
}

/** Single-page edit for an existing listing (owner only — enforced on the route + API). */
export function EditListingForm({ listing }: { listing: ListingWithRelations }) {
  const t = useTranslations("editListing");
  const tn = useTranslations("newListing");
  const tc = useTranslations("common");
  const tCond = useTranslations("condition");
  const tListing = useTranslations("listing");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(listing.category_id);
  const [condition, setCondition] = useState<ListingCondition>(listing.condition);
  const [countryId, setCountryId] = useState(listing.country_id);
  const [cityId, setCityId] = useState(listing.city_id);
  // Only active ⇄ hidden (paused) are user-togglable here.
  const [paused, setPaused] = useState(listing.status === "hidden");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      title: listing.title,
      description: listing.description,
      wanted_exchange: listing.wanted_exchange === "__any__" ? "" : listing.wanted_exchange,
      open_to_any: listing.wanted_exchange === "__any__",
    },
  });

  const openToAny = watch("open_to_any");

  async function onSubmit(values: Values) {
    setError(null);
    if (!categoryId || !countryId || !cityId) {
      setError(tc("selectCity"));
      return;
    }
    setSaving(true);
    const status: "hidden" | "active" = paused ? "hidden" : "active";
    const patch = {
      title: values.title,
      description: values.description,
      wanted_exchange: values.open_to_any ? "__any__" : values.wanted_exchange,
      condition,
      category_id: categoryId,
      country_id: countryId,
      city_id: cityId,
      status,
    };
    try {
      const api = getApi();
      if (api) await api.updateListing(listing.id, patch);
      else {
        // Supabase returns { error } instead of throwing — surface it.
        const { error: dbError } = await createClient().from("listings").update(patch).eq("id", listing.id);
        if (dbError) throw dbError;
      }
      router.push(`/listings/${listing.id}`);
      router.refresh();
    } catch {
      setError(t("saveError"));
      setSaving(false);
    }
  }

  async function del() {
    setDeleting(true);
    setError(null);
    try {
      const api = getApi();
      if (api) await api.deleteListing(listing.id);
      else {
        const { error: dbError } = await createClient()
          .from("listings")
          .update({ status: "removed" })
          .eq("id", listing.id);
        if (dbError) throw dbError;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError(t("saveError"));
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <h1 className="mb-5 text-lg font-extrabold tracking-tight text-ink">{t("title")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-bold text-ink">{tn("images")}</span>
          <ListingImageManager listingId={listing.id} initialImages={listing.images} />
        </div>

        <FormInput
          label={tn("fieldTitle")}
          error={errors.title && tn("fieldTitle")}
          {...register("title", { required: true })}
        />

        <div>
          <span className="mb-1.5 block text-sm font-bold text-ink">{tn("fieldCategory")}</span>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {TOP_LEVEL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                  categoryId === c.id
                    ? "border-green bg-green-light text-green-dark"
                    : "border-line bg-surface text-ink hover:bg-canvas",
                )}
              >
                <CategoryIcon icon={c.icon} className="h-4 w-4" />
                {localizedName(c, locale)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-ink">{tn("fieldCondition")}</span>
          <div className="grid grid-cols-2 gap-2.5">
            {(["new", "used"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={cn(
                  "rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors",
                  condition === c
                    ? "border-green bg-green-light text-green-dark"
                    : "border-line bg-surface text-ink hover:bg-canvas",
                )}
              >
                {tCond(c)}
              </button>
            ))}
          </div>
        </div>

        <CountryCitySelector
          countryId={countryId}
          cityId={cityId}
          onCountryChange={setCountryId}
          onCityChange={setCityId}
          countryLabel={tn("fieldCountry")}
          cityLabel={tn("fieldCity")}
          countryPlaceholder={tc("selectCountry")}
          cityPlaceholder={tc("selectCity")}
        />

        <FormTextarea label={tn("fieldDescription")} rows={4} {...register("description")} />

        <div className="mb-4">
          <FormCheckbox
            label={tn("fieldOpenToAny")}
            hint={tn("fieldOpenToAnyHint")}
            {...register("open_to_any")}
          />
        </div>

        <FormTextarea
          label={tn("fieldWanted")}
          rows={3}
          {...register("wanted_exchange")}
          disabled={openToAny}
          placeholder={openToAny ? tListing("openToAnyExchange") : ""}
        />

        {/* Status (active ⇄ paused) */}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex w-full items-center justify-between rounded-card border border-line bg-surface px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            {paused ? <EyeOff className="h-4 w-4 text-muted" aria-hidden /> : <Eye className="h-4 w-4 text-green" aria-hidden />}
            {paused ? t("statusPaused") : t("statusActive")}
          </span>
          <span className={cn("rounded-pill px-2 py-0.5 text-xs font-bold", paused ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-green-light text-green-dark")}>
            {paused ? t("paused") : t("active")}
          </span>
        </button>

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        <CTAButton type="submit" disabled={saving} className="w-full">
          {saving ? tc("saving") : tc("save")}
        </CTAButton>
      </form>

      {/* Delete */}
      <div className="mt-6 border-t border-line pt-5">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-ink/80">{t("deleteConfirm")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={del}
                disabled={deleting}
                className="flex-1 rounded-pill bg-danger py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? tc("saving") : t("deleteYes")}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">
                {tc("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-pill py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}
