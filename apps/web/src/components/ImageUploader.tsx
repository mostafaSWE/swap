"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { FREE_PLAN_MAX_IMAGES } from "@swap/config";
import { cn } from "@/lib/utils";

/**
 * Local image picker with previews. Holds File objects; the actual upload to
 * Supabase Storage happens on form submit.
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
  const inputRef = useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, max);
    onChange(next);
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {files.map((file, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
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
          aria-label="Add image"
        >
          <ImagePlus className="h-6 w-6" aria-hidden />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />
    </div>
  );
}
