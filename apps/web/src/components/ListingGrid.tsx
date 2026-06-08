import type { ListingWithRelations } from "@swap/types";
import { ListingCard } from "./ListingCard";

export function ListingGrid({ listings }: { listings: ListingWithRelations[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
