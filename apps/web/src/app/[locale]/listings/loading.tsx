import { ListingGridSkeleton } from "@/components/ListingGridSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-app px-4 py-4 md:max-w-6xl">
      <div className="skeleton mb-4 h-12 w-full" />
      <ListingGridSkeleton count={10} />
    </div>
  );
}
