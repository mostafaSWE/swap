import Image from "next/image";
import type { ListingWithRelations } from "@swap/types";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

/**
 * ItemArtwork — renders a listing's cover image, or a brand-tinted placeholder
 * (category icon + title) when no image exists. Replaces the bare `ImageOff`
 * fallback so image-less listings still look intentional.
 */
const TINT: Record<string, [string, string]> = {
  electronics: ["#0B1324", "#1e293b"],
  mobiles: ["#0f766e", "#0d9488"],
  computers: ["#1e3a8a", "#2563eb"],
  gaming: ["#581c87", "#7c3aed"],
  appliances: ["#155e75", "#0891b2"],
  furniture: ["#78350f", "#b45309"],
  "home-garden": ["#3f6212", "#65a30d"],
  cars: ["#0c4a6e", "#0369a1"],
  motorcycles: ["#7c2d12", "#c2410c"],
  fashion: ["#831843", "#be185d"],
  watches: ["#1c1917", "#44403c"],
  sports: ["#14532d", "#16a34a"],
  toys: ["#9a3412", "#ea580c"],
  cameras: ["#1e293b", "#475569"],
};
const NEUTRAL: [string, string] = ["#334155", "#475569"];

export function ItemArtwork({
  listing,
  className,
  sizes = "(max-width: 480px) 50vw, 240px",
}: {
  listing: ListingWithRelations;
  className?: string;
  sizes?: string;
}) {
  const cover = listing.images?.[0]?.image_url;

  if (cover) {
    return (
      <div className={cn("relative overflow-hidden bg-canvas", className)}>
        <Image src={cover} alt={listing.title} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  const [c1, c2] = TINT[listing.category?.icon ?? ""] ?? NEUTRAL;
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(150deg, ${c1}, ${c2})` }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0 2px,transparent 2px 13px)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-white/95">
        <CategoryIcon icon={listing.category?.icon ?? "other"} className="h-10 w-10 opacity-90 drop-shadow" />
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight opacity-90">{listing.title}</span>
      </div>
    </div>
  );
}
