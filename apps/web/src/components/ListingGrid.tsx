import type { ListingWithRelations } from "@swap/types";
import { ListingCard } from "./ListingCard";

export function ListingGrid({ listings }: { listings: ListingWithRelations[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
