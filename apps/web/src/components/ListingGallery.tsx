"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingImage } from "@swap/types";
import { cn } from "@/lib/utils";

/**
 * Marketplace media gallery. A 4:3 stage fills its frame with a blurred copy of
 * the active image behind an object-contain foreground — so portrait and
 * landscape items both look intentional with no raw letterbox gaps. Swipe on
 * touch, arrow keys + hover arrows on desktop, dots on mobile, a thumbnail strip
 * on larger screens, and an `overlay` slot for status/condition badges.
 */
export function ListingGallery({
  images,
  overlay,
}: {
  images: ListingImage[];
  overlay?: ReactNode;
}) {
  const t = useTranslations("listing");
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-card border border-line bg-surface text-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-10 w-10" aria-hidden />
          <span className="text-sm">{t("noImages")}</span>
        </div>
      </div>
    );
  }

  const count = images.length;
  const current = images[active]!;
  const go = (i: number) => setActive((i + count) % count);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? active + 1 : active - 1);
    touchX.current = null;
  }

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-[4/3] w-full select-none overflow-hidden rounded-card border border-line bg-night"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("galleryLabel")}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(active + 1);
          if (e.key === "ArrowLeft") go(active - 1);
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Blurred fill so the stage never shows raw letterbox bands. */}
        <Image
          key={`bg-${current.id}`}
          src={current.image_url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          aria-hidden
          className="scale-110 object-cover opacity-35 blur-2xl"
        />
        <Image
          key={current.id}
          src={current.image_url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          className="animate-fade-in object-contain"
          priority
        />

        {/* Status / condition badges. */}
        {overlay ? <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">{overlay}</div> : null}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label={t("prevImage")}
              className="absolute start-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronLeft className="h-5 w-5 rtl-flip" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label={t("nextImage")}
              className="absolute end-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronRight className="h-5 w-5 rtl-flip" aria-hidden />
            </button>

            <span className="absolute bottom-3 end-3 rounded-pill bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {active + 1}/{count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          {/* Dots — mobile. */}
          <div className="flex justify-center gap-1.5 sm:hidden">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "h-1.5 rounded-pill transition-all",
                  i === active ? "w-5 bg-accent" : "w-1.5 bg-linestrong",
                )}
              />
            ))}
          </div>

          {/* Thumbnails — tablet/desktop. */}
          <div className="no-scrollbar hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-night transition-colors",
                  i === active ? "border-accent" : "border-line hover:border-linestrong",
                )}
              >
                <Image src={img.image_url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
