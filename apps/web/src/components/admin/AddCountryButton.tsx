"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { upsertCountrySchema, type UpsertCountryInput } from "@swap/validation";
import { getApi } from "@/lib/api";
import { useAdminRefresh, adminApiReady } from "./action-kit";
import { Sheet } from "@/components/Sheet";
import { FormInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

export function AddCountryButton() {
  const t = useTranslations("admin.countriesPage");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<UpsertCountryInput>({
    resolver: zodResolver(upsertCountrySchema),
    defaultValues: {
      name_ar: "",
      name_en: "",
      iso_code: "",
      phone_code: "",
      currency_code: "",
      timezone: "",
      sort_order: 0,
      is_active: true,
    },
  });

  if (!adminApiReady()) return null;
  const api = getApi()!;

  const close = () => {
    setOpen(false);
    setError(null);
    reset();
  };

  const onSubmit = async (values: UpsertCountryInput) => {
    setError(null);
    try {
      await api.admin.createCountry(values);
      refresh();
      close();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || tc("error"));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all"
      >
        <Plus className="h-4 w-4" />
        {t("addBtn")}
      </button>

      {open && (
        <Sheet title={t("addTitle")} onClose={close} closeLabel={tc("close")}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5 overflow-y-auto max-h-[70vh]">
            <FormInput
              label={t("nameAr")}
              error={errors.name_ar?.message}
              {...register("name_ar")}
            />
            <FormInput
              label={t("nameEn")}
              error={errors.name_en?.message}
              {...register("name_en")}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label={t("isoCode")}
                maxLength={2}
                error={errors.iso_code?.message}
                {...register("iso_code")}
              />
              <FormInput
                label={t("phoneCode")}
                placeholder="+966"
                error={errors.phone_code?.message}
                {...register("phone_code")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label={t("currencyCode")}
                maxLength={3}
                placeholder="SAR"
                error={errors.currency_code?.message}
                {...register("currency_code")}
              />
              <FormInput
                label={t("timezone")}
                placeholder="Asia/Riyadh"
                error={errors.timezone?.message}
                {...register("timezone")}
              />
            </div>
            <FormInput
              type="number"
              label={t("sortOrder")}
              error={errors.sort_order?.message}
              {...register("sort_order", { valueAsNumber: true })}
            />

            {error && (
              <p role="alert" className="text-sm text-danger font-medium">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-pill border border-linestrong px-4 py-2 text-sm font-semibold text-ink hover:bg-elevated"
              >
                {tc("cancel")}
              </button>
              <CTAButton type="submit" disabled={isSubmitting}>
                {t("submit")}
              </CTAButton>
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}
