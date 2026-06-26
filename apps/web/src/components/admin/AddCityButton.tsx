"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { upsertCitySchema, type UpsertCityInput } from "@swap/validation";
import type { Country } from "@swap/types";
import { getApi } from "@/lib/api";
import { useAdminRefresh, adminApiReady } from "./action-kit";
import { Sheet } from "@/components/Sheet";
import { FormInput, SelectInput } from "@/components/forms";
import { CTAButton } from "@/components/CTAButton";

export function AddCityButton({ countries }: { countries: Country[] }) {
  const t = useTranslations("admin.citiesPage");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryOptions = countries.map((c) => ({
    value: c.id,
    label: c.name_en,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<UpsertCityInput>({
    resolver: zodResolver(upsertCitySchema),
    defaultValues: {
      country_id: countries[0]?.id ?? "",
      name_ar: "",
      name_en: "",
      slug: "",
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

  const onSubmit = async (values: UpsertCityInput) => {
    setError(null);
    try {
      await api.admin.createCity(values);
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
            <SelectInput
              label={t("country")}
              options={countryOptions}
              error={errors.country_id?.message}
              {...register("country_id")}
            />
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
            <FormInput
              label={t("slug")}
              placeholder="riyadh"
              error={errors.slug?.message}
              {...register("slug")}
            />
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
