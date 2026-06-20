"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FREE_PLAN_MAX_IMAGES, STORAGE_BUCKETS } from "@swap/config";
import type { ListingImage } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Edit-time image manager for an existing listing: add / remove / reorder, each
 * persisted immediately through the backend (signed upload, delete, reorder).
 * Position 0 is the cover. Requires the backend API for mutations (image edits
 * are owner-checked server-side); falls back to read-only when it isn't set.
 */
export function ListingImageManager({
  listingId,
  initialImages,
}: {
  listingId: string;
  initialImages: ListingImage[];
}) {
  const t = useTranslations("editListing");
  const tn = useTranslations("newListing");
  const [images, setImages] = useState<ListingImage[]>(
    [...initialImages].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const api = getApi();

  async function refresh() {
    const { data } = await createClient()
      .from("listing_images")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true });
    if (data) setImages(data as ListingImage[]);
  }

  async function add(list: FileList | null) {
    if (!list || !api) return;
    const picked = Array.from(list).slice(0, Math.max(0, FREE_PLAN_MAX_IMAGES - images.length));
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      for (const file of picked) {
        const { path, token } = await api.signListingImageUpload(listingId, file.name);
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKETS.listingImages)
          .uploadToSignedUrl(path, token, file);
        if (upErr) continue;
        const { data: pub } = supabase.storage.from(STORAGE_BUCKETS.listingImages).getPublicUrl(path);
        await api.addListingImage(listingId, pub.publicUrl);
      }
      await refresh();
    } catch {
      setError(t("imageError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    }
  }

  async function remove(id: string) {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeListingImage(listingId, id);
      setImages((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError(t("imageError"));
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!api) return;
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[index], next[j]] = [next[j]!, next[index]!];
    setImages(next);
    setBusy(true);
    setError(null);
    try {
      await api.reorderListingImages(listingId, next.map((x) => x.id));
    } catch {
      setError(t("imageError"));
      await refresh(); // re-sync on failure
    } finally {
      setBusy(false);
    }
  }

  const canEdit = Boolean(api);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
            <Image src={img.image_url} alt="" fill sizes="120px" className="object-cover" />
            {i === 0 ? (
              <span className="absolute start-1 top-1 rounded-full bg-green px-1.5 py-0.5 text-[9px] font-bold text-white">
                {tn("cover")}
              </span>
            ) : null}
            {canEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  disabled={busy}
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label={tn("removeImage")}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
                {images.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                      aria-label={tn("moveBack")}
                      className="p-1 text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={busy || i === images.length - 1}
                      aria-label={tn("moveForward")}
                      className="p-1 text-white disabled:opacity-30"
                    >
                      <ChevronRight className="rtl-flip h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ))}

        {canEdit && images.length < FREE_PLAN_MAX_IMAGES ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line text-muted",
              "hover:border-green hover:text-green disabled:opacity-50",
            )}
            aria-label={tn("addImage")}
          >
            <ImagePlus className="h-6 w-6" aria-hidden />
          </button>
        ) : null}

        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>

      {!canEdit ? <p className="mt-2 text-xs text-muted">{t("imagesNeedApi")}</p> : null}
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
