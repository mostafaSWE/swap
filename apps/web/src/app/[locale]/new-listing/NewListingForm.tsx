"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeftRight, Check, ChevronLeft, Repeat2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  CATEGORY_BY_ID,
  FREE_PLAN_MAX_IMAGES,
  STORAGE_BUCKETS,
  TOP_LEVEL_CATEGORIES,
} from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Category, ListingCondition, Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { isEmailNotVerifiedError } from "@/lib/api-errors";
import { useRouter } from "@/i18n/navigation";
import { FormInput, FormTextarea, FormCheckbox } from "@/components/forms";
import { CountryCitySelector } from "@/components/CountryCitySelector";
import { ImageUploader } from "@/components/ImageUploader";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

interface Values {
  title: string;
  description: string;
  wanted_exchange: string;
  open_to_any?: boolean;
}

const TOTAL_STEPS = 3;

/** Small labelled field wrapper used inside the wizard steps. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-bold text-ink">{label}</span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ExchangePreview({
  title,
  category,
  categoryName,
  coverUrl,
  wanted,
  modeLabel,
  titleLabel,
  wantedLabel,
  previewLabel,
}: {
  title: string;
  category?: Category;
  categoryName: string;
  coverUrl: string | null;
  wanted: string;
  modeLabel: string;
  titleLabel: string;
  wantedLabel: string;
  previewLabel: string;
}) {
  return (
    <section className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{previewLabel}</p>
        <span className="max-w-[56%] truncate rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
          {modeLabel}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-linestrong bg-surface p-3 shadow-card">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-accent/10 to-transparent" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] sm:gap-3">
          <PreviewSide label={titleLabel} title={title} meta={categoryName}>
            <PreviewMedia title={title} category={category} coverUrl={coverUrl} />
          </PreviewSide>

          <div className="flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-glow ring-4 ring-accent/10 sm:h-12 sm:w-12">
              <ArrowLeftRight className="rtl-flip h-5 w-5" aria-hidden strokeWidth={2.5} />
            </span>
          </div>

          <PreviewSide label={wantedLabel} title={wanted} meta={modeLabel} accent>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/35 bg-accent text-white shadow-card">
              <Repeat2 className="h-7 w-7" aria-hidden strokeWidth={2.3} />
            </span>
          </PreviewSide>
        </div>
      </div>
    </section>
  );
}

function PreviewSide({
  label,
  title,
  meta,
  accent,
  children,
}: {
  label: string;
  title: string;
  meta: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[142px] min-w-0 flex-col items-center justify-between rounded-2xl border px-3 py-3 text-center",
        accent ? "border-accent/35 bg-accent-soft" : "border-line bg-canvas/75",
      )}
    >
      <span className={cn("max-w-full truncate text-[10px] font-bold uppercase tracking-wide", accent ? "text-accent" : "text-muted")}>
        {label}
      </span>
      {children}
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-sm font-extrabold leading-5 text-ink">{title}</p>
        <p className={cn("mt-1 line-clamp-1 text-[11px] font-medium", accent ? "text-accent" : "text-muted")}>{meta}</p>
      </div>
    </div>
  );
}

function PreviewMedia({
  title,
  category,
  coverUrl,
}: {
  title: string;
  category?: Category;
  coverUrl: string | null;
}) {
  if (coverUrl) {
    return (
      <span
        role="img"
        aria-label={title}
        className="block h-14 w-14 rounded-2xl border border-line bg-elevated bg-cover bg-center shadow-card"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />
    );
  }

  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-linestrong bg-elevated text-ink shadow-card">
      <CategoryIcon icon={category?.icon ?? "other"} className="h-7 w-7" />
    </span>
  );
}

/**
 * Add New Listing — 3-step wizard (redesign).
 *   1. Photos + title + category   2. Condition + location + description
 *   3. Wanted-in-exchange + live SwapPair preview + safety note
 *
 * Data flow is unchanged from the single-page form: react-hook-form for text
 * fields, local state for category/condition/location/photos, and the same
 * API-first (with Supabase fallback) submit + signed image upload.
 */
export function NewListingForm() {
  const t = useTranslations("newListing");
  const tc = useTranslations("common");
  const tCond = useTranslations("condition");
  const tListing = useTranslations("listing");
  const tAuth = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<ListingCondition>("used");
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    watch,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ defaultValues: { title: "", description: "", wanted_exchange: "" } });

  const title = watch("title");
  const wanted = watch("wanted_exchange");
  const openToAny = watch("open_to_any");
  const previewWanted = openToAny ? tListing("openToAnyExchange") : wanted;
  const selectedCategory: Category | undefined = categoryId ? CATEGORY_BY_ID[categoryId] : undefined;
  const coverPreviewUrl = useMemo(() => {
    const cover = files[0];
    return cover ? URL.createObjectURL(cover) : null;
  }, [files]);
  const previewTitle = title.trim() || t("yourItem");
  const previewWantedText = previewWanted.trim() || tListing("openToOffers");
  const previewCategoryName = selectedCategory ? localizedName(selectedCategory, locale) : t("fieldCategory");
  const previewModeLabel = openToAny ? t("fieldOpenToAny") : tListing("wantedExchange");

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  async function next() {
    setError(null);
    if (step === 1) {
      const ok = await trigger("title");
      if (!ok) return;
      if (!categoryId) {
        setError(tc("selectCategory"));
        return;
      }
    }
    if (step === 2 && (!countryId || !cityId)) {
      setError(tc("selectCity"));
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
    else router.push("/");
  }

  async function onSubmit(values: Values) {
    setError(null);
    if (!categoryId) {
      setStep(1);
      setError(tc("selectCategory"));
      return;
    }
    if (!countryId || !cityId) {
      setStep(2);
      setError(tc("selectCity"));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const payload = {
      category_id: categoryId,
      country_id: countryId,
      city_id: cityId,
      title: values.title,
      description: values.description,
      condition,
      wanted_exchange: values.open_to_any ? "__any__" : values.wanted_exchange,
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
          setSubmitting(false);
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
    } catch (err) {
      setSubmitting(false);
      setError(isEmailNotVerifiedError(err) ? tAuth("verifyRequired") : t("title"));
      return;
    }

    router.push(`/listings/${listingId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      {/* Header + progress */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label={tc("back")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-canvas"
        >
          <ChevronLeft className="rtl-flip h-5 w-5" aria-hidden />
        </button>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ink">{t("title")}</h1>
          <p className="text-xs text-muted">{t("step", { current: step, total: TOTAL_STEPS })}</p>
        </div>
      </div>
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-green" : "bg-line")}
          />
        ))}
      </div>

      <div className="space-y-5">
        {/* ── Step 1: photos + title + category ── */}
        {step === 1 ? (
          <>
            <Field label={t("images")} hint={t("imagesHint", { max: FREE_PLAN_MAX_IMAGES })}>
              <ImageUploader files={files} onChange={setFiles} />
            </Field>

            <FormInput
              label={t("fieldTitle")}
              error={errors.title && t("fieldTitle")}
              {...register("title", { required: true })}
            />

            <Field label={t("fieldCategory")}>
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
            </Field>
          </>
        ) : null}

        {/* ── Step 2: condition + location + description ── */}
        {step === 2 ? (
          <>
            <Field label={t("fieldCondition")}>
              <div className="grid grid-cols-2 gap-2.5">
                {(["new", "used"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={cn(
                      "rounded-xl border-2 px-4 py-3.5 text-sm font-bold transition-colors",
                      condition === c
                        ? "border-green bg-green-light text-green-dark"
                        : "border-line bg-surface text-ink hover:bg-canvas",
                    )}
                  >
                    {tCond(c)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t("fieldLocation")}>
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
            </Field>

            <FormTextarea label={t("fieldDescription")} rows={4} {...register("description")} />
          </>
        ) : null}

        {/* ── Step 3: wanted + live preview + safety ── */}
        {step === 3 ? (
          <>
            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <FormCheckbox
                label={t("fieldOpenToAny")}
                hint={t("fieldOpenToAnyHint")}
                {...register("open_to_any")}
              />
            </div>

            <FormTextarea
              label={t("fieldWanted")}
              rows={3}
              {...register("wanted_exchange")}
              disabled={openToAny}
              className={cn(openToAny && "bg-elevated text-muted")}
              placeholder={openToAny ? tListing("openToAnyExchange") : ""}
            />

            <ExchangePreview
              title={previewTitle}
              category={selectedCategory}
              categoryName={previewCategoryName}
              coverUrl={coverPreviewUrl}
              wanted={previewWantedText}
              modeLabel={previewModeLabel}
              titleLabel={t("yourItem")}
              wantedLabel={t("previewWanted")}
              previewLabel={t("swapPreview")}
            />

            <SafetyDisclaimer variant="compact" />
          </>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {/* Footer actions */}
      <div className="mt-7 flex gap-3">
        {step > 1 ? (
          <button type="button" onClick={back} className="btn-secondary flex-1">
            {tc("back")}
          </button>
        ) : null}
        {step < TOTAL_STEPS ? (
          <button type="button" onClick={next} className="btn-primary flex-1">
            {tc("next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="btn-primary flex-1"
          >
            <Check className="h-[18px] w-[18px]" aria-hidden strokeWidth={2.4} />
            {t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
