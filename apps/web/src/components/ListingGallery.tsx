"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingImage } from "@swap/types";
import { cn } from "@/lib/utils";

/** Image gallery with a main image and a thumbnail strip. */
export function ListingGallery({ images }: { images: ListingImage[] }) {
  const t = useTranslations("listing");
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-card bg-canvas text-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-10 w-10" aria-hidden />
          <span className="text-sm">{t("noImages")}</span>
        </div>
      </div>
    );
  }

  const current = images[active]!;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-card bg-canvas">
        <Image src={current.image_url} alt="" fill sizes="480px" className="object-cover" priority />
      </div>
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2",
                i === active ? "border-green" : "border-transparent",
              )}
            >
              <Image src={img.image_url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
