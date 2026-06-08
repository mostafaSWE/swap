import type { ListingWithRelations } from "@swap/types";
import { ListingCard } from "./ListingCard";

export function ListingGrid({ listings }: { listings: ListingWithRelations[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
