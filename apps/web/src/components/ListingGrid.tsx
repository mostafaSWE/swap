import type { ListingWithRelations } from "@swap/types";
import { ListingCard } from "./ListingCard";

/**
 * Responsive listing grid. Uses auto-fill tracks with a per-card minimum so a
 * lone card on the last row keeps its normal width and aligns to the start —
 * it never stretches to fill the row.
 */
export function ListingGrid({ listings }: { listings: ListingWithRelations[] }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15.5rem),1fr))]">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
