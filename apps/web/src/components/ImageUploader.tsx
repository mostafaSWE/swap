"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FREE_PLAN_MAX_IMAGES } from "@swap/config";
import { cn } from "@/lib/utils";

/**
 * Local image picker with previews + reordering. Holds File objects; the actual
 * upload to Supabase Storage happens on form submit, in array order (so position
 * 0 becomes the cover). Object URLs are memoized + revoked to avoid leaks.
 *
 * Free plan = FREE_PLAN_MAX_IMAGES images.
 * TODO (Phase 2 — premium): raise `max` for paid plans (10–15).
 */
export function ImageUploader({
  files,
  onChange,
  max = FREE_PLAN_MAX_IMAGES,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const t = useTranslations("newListing");
  const inputRef = useRef<HTMLInputElement>(null);
  // Cache object URLs by File identity so reorder/add/remove keeps stable srcs
  // for unchanged thumbnails (no re-decode flicker) and never leaks.
  const cacheRef = useRef(new Map<File, string>());
  const urls = useMemo(
    () =>
      files.map((f) => {
        let url = cacheRef.current.get(f);
        if (!url) {
          url = URL.createObjectURL(f);
          cacheRef.current.set(f, url);
        }
        return url;
      }),
    [files],
  );
  useEffect(() => {
    // Revoke URLs for files that were removed.
    const present = new Set(files);
    for (const [f, url] of cacheRef.current) {
      if (!present.has(f)) {
        URL.revokeObjectURL(url);
        cacheRef.current.delete(f);
      }
    }
  }, [files]);
  useEffect(() => {
    const cache = cacheRef.current;
    return () => cache.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function add(list: FileList | null) {
    if (!list) return;
    onChange([...files, ...Array.from(list)].slice(0, max));
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {files.map((file, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[i]} alt="" className="h-full w-full object-cover" />
          {i === 0 ? (
            <span className="absolute start-1 top-1 rounded-full bg-green px-1.5 py-0.5 text-[9px] font-bold text-white">
              {t("cover")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
            aria-label={t("removeImage")}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
          {files.length > 1 ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t("moveBack")}
                className="p-1 text-white disabled:opacity-30"
              >
                <ChevronLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === files.length - 1}
                aria-label={t("moveForward")}
                className="p-1 text-white disabled:opacity-30"
              >
                <ChevronRight className="rtl-flip h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {files.length < max ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line text-muted",
            "hover:border-green hover:text-green",
          )}
          aria-label={t("addImage")}
        >
          <ImagePlus className="h-6 w-6" aria-hidden />
        </button>
      ) : null}

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
